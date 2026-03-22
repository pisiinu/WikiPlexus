# 文庫びより デバッグ記録

## 未解決の不具合

### 1. 外字（gaiji）の後のルビが表示されない（→ v26 で構造ごと廃止）
**症状**: 山月記など、外字画像を含む作品で、最初の外字が出現した箇所以降のルビが表示されなくなる。外字自体のルビは（あれば）表示される場合もある。

**確認環境**: iOS Safari（主）

**試したこと（すべて効果なし）**:
| バージョン | 施策 | 結果 |
|---|---|---|
| v3/v4 | `<rp>` 除去 regex を削除し CSS `rp{display:none}` に変更 | 効果なし |
| v5 | `<rb>` タグをすべてグローバルに除去 | 全ルビが壊れる regression → 後に reverted |
| v8 | `<rb><img.../></rb>` のみ対象を絞って除去（外字内の rb だけ処理） | 効果なし |
| v9 | `<rb>` タグ全除去 + `<rp>` タグ中身ごと除去 → HTML5 ruby: `<ruby>base<rt>読み</rt></ruby>` | 効果なし |
| v10 | `ruby{display:inline-flex;flex-direction:column-reverse}` でネイティブruby回避 | ルビのある文字が小さく見える（列幅1.5em < line-height 1.8em）、ルビは表示されず |
| a3c2e35/5f54fc7 | `ruby{display:inline-block;position:relative}` + `rt{position:absolute;right:-0.6em}` でネイティブruby回避 | 「reversed ruby layout」でrevertedされた（原因：writing-modeをrtに明示しなかったため水平文字になった可能性） |
| f714c00 | overflow:scroll と writing-mode:vertical-rl を別要素に分離、外側を`direction:rtl`に | 後の 88ee10b で元に戻された。scrollLeft 計算が iOS Safari では RTL でも正常動作した可能性あるが未確認 |
| v11 | `ruby{display:inline-block;position:relative}` + `rt{position:absolute;writing-mode:vertical-rl;right:-1em;top:0}` writing-mode明示 | **未テスト** |
| v12 | `<ruby>` → `<span class="rw">` に変換してネイティブrubyを回避。`display:inline;position:relative`、`rt{position:absolute;right:-1em;top:0}` | 漢字サイズは修正されたが、ルビ・傍点が完全消滅。原因: `display:inline;position:relative` はiOS Safariでabsolute childのcontaining blockを生成しない → overflow+writing-modeのスクロールコンテナ基準に配置され画面外へ |
| v13 | `direction:rtl`外側div（overflow） + `direction:ltr;writing-mode:vertical-rl`内側div の分離。ネイティブ`<ruby>`を復元。`.sd{display:inline-block;position:relative}`、`::after{position:absolute;right:-0.55em}` | ルビ: 外字後のルビ依然消える。傍点: inline-blockで文字が小さくなった |
| v14 | 外字を`<span class="gaiji">`で包みHiragino Mincho等を明示（フォントフォールバック切替によるruby破壊の仮説）。`.sd`を`display:inline`に戻す | **未テスト（現在のバージョン）** |

**現在の HTML 構造（v13 処理後）**:
```html
<!-- 外字が ruby 内にあった場合 -->
<ruby>傪<rt>さん</rt></ruby>
<!-- 通常の ruby -->
<ruby>漢字<rt>かんじ</rt></ruby>
```
（v12で一時的に`<span class="rw">`に変換していたが、v13でネイティブrubyに戻した）

**未調査の仮説**:
1. **overflow+writing-mode 同一要素問題**: scroll コンテナに `overflow-x:scroll` と `writing-mode:vertical-rl` が同居している（f714c00 が修正しようとした問題）。88ee10b で元に戻った可能性。
2. **外字文字の font fallback 問題**: 傪(U+4509)などのレアな Unicode 文字がフォールバックフォントで描画され、そのフォントが vertical-rl のメトリクスを狂わせる。
3. **注記除去後の残骸**: `［＃...］` 除去後に何かタグが壊れている。
4. **<rt> 内容の問題**: `<rt>` の中に想定外の構造が残っている。
5. **CSS text-emphasis との干渉**: 傍点 CSS と ruby の競合。

**次に試すべきこと**:
- 実際の 623_18353.html を fetch してルビ周辺の HTML 構造を直接確認する
- overflow と writing-mode を別 div に分離する（f714c00 の再実装）
- 傪などの外字文字を `<span class="gaiji">傪</span>` で包み、font-family を明示的に指定する
- ruby を CSS position:absolute で完全置換するアプローチを再試（a3c2e35 の再調査）

---

### 2. ルビのある行の列幅が広い（iOS Safari）→ v26 で修正試行

**症状**: ルビのある文字の「行」（縦書きなので列）が他より幅広になる。PCのChromeでは正常。

**原因**: iOS Safari はネイティブ `<ruby>` 要素の列幅を独自に計算し、`line-height:1` を指定しても無効。

**v25までの試み**: `ruby{line-height:1}`, `ruby>span{line-height:1}`, `rt{line-height:1}` → 効果なし

**v26 対応**:
- `<ruby>...<rt>...</rt></ruby>` を `<span class="rw"><span class="rb">...</span><span class="rt">...</span></span>` に変換（parser側）
- CSS: `.rw{display:inline;position:relative}`, `.rt{position:absolute;writing-mode:vertical-rl;right:-1em;top:0;font-size:0.75em;line-height:1;white-space:nowrap}`
- `position:absolute` のため `.rt` は列幅計算に寄与しない → 列幅が均一になるはず
- v12で同様の試みが失敗した理由: overflow+writing-mode が同一要素にあり含有ブロックがscrollコンテナになった → v13+の direction:rtl 分離で解消済み

---

### 3. 傍点の行間が他より広い
**症状**: 傍点（SESAME_DOT）のある行が他の行より行間が広くなる。

**原因**: `text-emphasis` プロパティが行ボックスに傍点用のスペースを確保するため行高が増加する。

**試したこと**:
| バージョン | 施策 | 結果 |
|---|---|---|
| v7/v8 | `text-emphasis: filled sesame` で傍点表示 | 表示はされるが行間が広い |
| v9 | `text-emphasis: "・"` (ナカグロ文字) に変更 | ナカグロになったが行間はまだ広い |

**根本原因**: `text-emphasis` は文字の外側にマークを描画するため、どんな文字を指定しても行高が増加する。文字の種類ではなく仕組みの問題。

**未解決**: `position:absolute` の `::after` + 1文字ずつ `<span>` で囲む方法なら行高に影響しない可能性あり（未実装）。

---

## 解決済み

### 傍点が太字になる
`<strong class="SESAME_DOT">` に対し `font-weight: normal` を追加（v8）。

### 外字が表示されない / ※ になる
- `resolveGaiji()` の key 計算: `第N水準plane-row-col` → `N-hex(row+0x20)hex(col+0x20)`
- 例: 第4水準2-01-79 → `4-216F` → 傪 (U+4509)
- GAIJI_TABLE に各 key が存在することを確認済み

### iOS Safari で縦書きスクロールが壊れる
`overflow:scroll` と `writing-mode:vertical-rl` を同一要素に設定すると壊れる問題（f714c00）。

---

## 山月記（623_18353.html）について
- 外字 img タグ: 24個
- 傪 (U+4509): 16回登場（2-01/2-01-79.png → `4-216F`）
- ruby 内 rb に外字: 11個
- `<rp>` タグ: すべて正しく閉じられている
- 傍点マークアップ: `<strong class="SESAME_DOT">` （`<em>` ではない）
- 人間失格: `<em class="sesame_dot">` (小文字、異なる)

## ファイル構成
- `src/utils/aozoraParser.js` — Shift-JIS デコード・HTML 加工パイプライン
- `src/hooks/useBookText.js` — fetch + LocalStorage キャッシュ（現在 v9_）
- `src/App.jsx` — PageReader コンポーネント・CSS（縦書き・ruby・傍点）
- `src/data/gaiji-table.js` — JIS X 0213 → Unicode マッピング
