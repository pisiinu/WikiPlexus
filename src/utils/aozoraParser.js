import { GAIJI_TABLE } from '../data/gaiji-table.js';

const GITHUB_BASE = 'https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/';
const AOZORA_BASE = 'https://www.aozora.gr.jp/';

export function toRawUrl(url) {
  return url.startsWith(AOZORA_BASE) ? url.replace(AOZORA_BASE, GITHUB_BASE) : url;
}

function resolveGaiji(alt) {
  const m = alt.match(/第([34])水準(\d+)-(\d+)-(\d+)/);
  if (!m) return '※';
  const level = m[1];
  const row = parseInt(m[3]);
  const col = parseInt(m[4]);
  const key = `${level}-${(row + 0x20).toString(16).toUpperCase().padStart(2, '0')}${(col + 0x20).toString(16).toUpperCase().padStart(2, '0')}`;
  return GAIJI_TABLE[key] ?? '※';
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

  // 外字 img → Unicode（span で包んで後続ルビへの影響をリセット）
  html = html.replace(/<img[^>]*alt="([^"]*)"[^>]*\/?>/gi,
    (_, alt) => `<span class="gaiji">${resolveGaiji(alt)}</span>`);
  // 残った img タグを除去
  html = html.replace(/<img[^>]*\/?>/gi, '');
  // <rb>タグを除去（内容保持）→ HTML5 ruby 形式に統一
  html = html.replace(/<\/?rb>/gi, '');
  // 青空文庫注記 ［＃...］ を除去
  html = html.replace(/［＃[^］]*］/g, '');
  return html;
}

/** Vercel API 経由で青空文庫 XHTML を取得・処理 */
export async function fetchAozoraHtml(url) {
  const rawUrl = toRawUrl(url);
  const proxyUrl = `/api/aozora?url=${encodeURIComponent(rawUrl)}`;
  const resp = await fetch(proxyUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buf = await resp.arrayBuffer();
  return processAozoraHtml(buf);
}
