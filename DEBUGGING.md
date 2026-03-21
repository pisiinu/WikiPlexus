# 文庫びより デバッグ記録

## 未解決の不具合

### 1. 外字（gaiji）の後のルビが表示されない
**症状**: 山月記など、外字画像を含む作品で、最初の外字が出現した箇所以降のルビが表示されなくなる。外字自体のルビは（あれば）表示される場合もある。

**確認環境**: iOS Safari（主）

**試したこと（すべて効果なし）**:
| バージョン | 施策 | 結果 |
|---|---|---|
| v3/v4 | `<rp>` 除去 regex を削除し CSS `rp{display:none}` に変更 | 効果なし |
| v5 | `<rb>` タグをすべてグローバルに除去 | 全ルビが壊れる regression → 後に reverted |
| v8 | `<rb><img.../></rb>` のみ対象を絞って除去（外字内の rb だけ処理） | 効果なし |
| v9 | `<rb>` タグ全除去 + `<rp>` タグ中身ごと除去 → HTML5 ruby: `<ruby>base<rt>読み</rt></ruby>` | 効果なし |
| a3c2e35 | native ruby を使わず position:absolute でルビを描画（CSS完全置換） | 後にrevertedされた（理由不明） |
| f714c00 | overflow:scroll と writing-mode:vertical-rl を別要素に分離（iOS Safari対策） | 後の 88ee10b で元に戻された可能性あり |

**現在の HTML 構造（v9 処理後）**:
```html
<!-- 外字が ruby 内にあった場合 -->
<ruby>傪<rt>さん</rt></ruby>
<!-- 通常の ruby -->
<ruby>漢字<rt>かんじ</rt></ruby>
```

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

### 2. 傍点の行間が他より広い
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
