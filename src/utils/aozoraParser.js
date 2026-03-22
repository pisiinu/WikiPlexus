import { GAIJI_TABLE } from '../data/gaiji-table.js';

// 青空文庫の gaiji 画像のうち JIS X 0208 由来（alt に「第N水準」がないもの）の変換テーブル
// キー形式: "面-区-点"（alt テキスト内の N-row-col 表記に合わせる）
const GAIJI_JIS0208 = {
  '1-2-22': '々', // 二の字点 U+3005
};

const GITHUB_BASE = 'https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/';
const AOZORA_BASE = 'https://www.aozora.gr.jp/';

export function toRawUrl(url) {
  return url.startsWith(AOZORA_BASE) ? url.replace(AOZORA_BASE, GITHUB_BASE) : url;
}

function resolveGaiji(alt) {
  // 第3・第4水準: "第3水準1-14-7" 形式
  const m = alt.match(/第([34])水準(\d+)-(\d+)-(\d+)/);
  if (m) {
    const key = `${m[1]}-${(parseInt(m[3]) + 0x20).toString(16).toUpperCase().padStart(2, '0')}${(parseInt(m[4]) + 0x20).toString(16).toUpperCase().padStart(2, '0')}`;
    return GAIJI_TABLE[key] ?? '※';
  }
  // JIS X 0208: "1-2-22" 形式（第N水準プレフィックスなし）
  const m2 = alt.match(/(\d+)-(\d+)-(\d+)/);
  if (m2) return GAIJI_JIS0208[`${m2[1]}-${m2[2]}-${m2[3]}`] ?? '※';
  return '※';
}

/**
 * 青空文庫 XHTML（Shift-JIS）から <div class="main_text"> の内容を HTML のまま返す。
 * - 外字 <img> を Unicode に置換
 * - ［＃...］注記を除去
 * - ruby・em・傍点など書式タグはそのまま保持
 */
export function processAozoraHtml(arrayBuffer) {
  let html = new TextDecoder('shift_jis').decode(arrayBuffer);

  // main_text div を抽出（開始タグ終端 〜 bibliography div の直前）
  const mainOpen = html.search(/<div[^>]+class=["']?main_text["']?/i);
  if (mainOpen !== -1) {
    const tagEnd   = html.indexOf('>', mainOpen) + 1;
    const bibStart = html.search(/<div[^>]+class=["']?bibliography["']?/i);
    const bodyEnd  = html.search(/<\/body>/i);
    const sliceEnd = bibStart > tagEnd ? bibStart : (bodyEnd > tagEnd ? bodyEnd : html.length);
    html = html.slice(tagEnd, sliceEnd);
  }

  // div タグを除去: 開始タグ → <br>（段落区切り）、終了タグ → 削除
  // div の margin/padding/height が縦書きで予期しない影響を与えるため
  html = html.replace(/<div[^>]*>/gi, '<br>');
  html = html.replace(/<\/div>/gi, '<br>');
  // 先頭の空白・<br> を除去（1ページ目右端の余白をなくす）
  html = html.replace(/^(\s*<br\s*\/?>\s*)+/i, '');

  // 外字 img → Unicode（rb内・外どちらも）。<span class="gaiji"> で包みフォントを明示
  // （iOSでNoto Serif JPにない文字のフォールバック切替がruby描画を壊す可能性への対策）
  html = html.replace(/<img[^>]*alt="([^"]*)"[^>]*\/?>/gi, (_, alt) => `<span class="gaiji">${resolveGaiji(alt)}</span>`);
  // 残った img タグを除去
  html = html.replace(/<img[^>]*\/?>/gi, '');
  // <rp> を中身ごと除去（フォールバック括弧不要）
  html = html.replace(/<rp[^>]*>[^<]*<\/rp>/gi, '');
  html = html.replace(/<\/?rp[^>]*>/gi, '');
  // <rb> タグを除去（中身は保持）
  html = html.replace(/<\/?rb[^>]*>/gi, '');
  // <ruby>/<rt> はネイティブのまま残す
  // 列幅は CSS multi-column の column-width で固定するため、ruby が列幅を広げても
  // 列境界（ページ境界）には影響しない（ルビが隣の列にはみ出すだけ）
  // 傍点(sesame系): 1文字ずつ <span class="sd"> に分割
  // → CSS position:absolute の ::after でナカグロを付与（line-height に影響しない）
  html = html.replace(
    /<(?:strong|em)[^>]*class="(?:SESAME_DOT|sesame_dot|sesame|傍点|ゴマ傍点|黒ゴマ傍点)"[^>]*>([^<]*)<\/(?:strong|em)>/gi,
    (_, text) => [...text].map(ch => `<span class="sd">${ch}</span>`).join('')
  );
  // インラインスタイルから margin-left を除去
  // 横書き前提の margin-left は縦書きコンテキストで列高・配置に悪影響を与える
  html = html.replace(/ style="([^"]*)"/gi, (_, styles) => {
    const cleaned = styles.split(';')
      .filter(s => !/^\s*margin-left\s*:/i.test(s))
      .join(';').replace(/^;+|;+$/g, '').trim();
    return cleaned ? ` style="${cleaned}"` : '';
  });
  // 青空文庫注記 ［＃...］ を除去
  html = html.replace(/［＃[^］]*］/g, '');
  return html;
}

/** Vercel API 経由で青空文庫 XHTML を取得・処理（Web Worker で実行しメインスレッドをブロックしない） */
export async function fetchAozoraHtml(url) {
  const rawUrl = toRawUrl(url);
  const proxyUrl = `/api/aozora?url=${encodeURIComponent(rawUrl)}`;
  const resp = await fetch(proxyUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buf = await resp.arrayBuffer();

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/aozora.worker.js', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data.html);
    };
    worker.onerror = () => { worker.terminate(); reject(new Error('worker error')); };
    worker.postMessage({ buffer: buf }, [buf]); // ArrayBuffer を転送（ゼロコピー）
  });
}
