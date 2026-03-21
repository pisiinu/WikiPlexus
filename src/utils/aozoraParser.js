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

  // 外字 img → Unicode
  html = html.replace(/<img[^>]*alt="([^"]*)"[^>]*\/?>/gi, (_, alt) => resolveGaiji(alt));
  // 残った img タグを除去
  html = html.replace(/<img[^>]*\/?>/gi, '');
  // 青空文庫注記 ［＃...］ を除去
  html = html.replace(/［＃[^］]*］/g, '');
  // <rp>タグ・内容および<rb>タグを除去
  // → <ruby>Base<rt>Reading</rt></ruby> の最小構造にする
  html = html.replace(/<rp[^>]*>[^<]*<\/rp>/gi, '');
  html = html.replace(/<\/?rb[^>]*>/gi, '');

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
