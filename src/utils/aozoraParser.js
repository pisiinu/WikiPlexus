import { GAIJI_TABLE } from '../data/gaiji-table.js';

const GITHUB_BASE = 'https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/';
const AOZORA_BASE = 'https://www.aozora.gr.jp/';

/** Aozora Bunko URL を GitHub Raw URL に変換 */
export function toRawUrl(url) {
  if (url.startsWith(AOZORA_BASE)) {
    return url.replace(AOZORA_BASE, GITHUB_BASE);
  }
  return url;
}

/** 外字 img alt から Unicode 文字に変換（JIS X 0213 第3・第4水準） */
function resolveGaiji(alt) {
  const m = alt.match(/第([34])水準(\d+)-(\d+)-(\d+)/);
  if (!m) return '※';
  const level = m[1];
  const row = parseInt(m[3]);
  const col = parseInt(m[4]);
  const key = `${level}-${(row + 0x20).toString(16).toUpperCase().padStart(2, '0')}${(col + 0x20).toString(16).toUpperCase().padStart(2, '0')}`;
  return GAIJI_TABLE[key] ?? '※';
}

/** 青空文庫 HTML（ShiftJIS バッファ）を処理して HTML フラグメントを返す */
export function processAozoraHtml(arrayBuffer) {
  let html = new TextDecoder('shift_jis').decode(arrayBuffer);

  // 1. 外字画像を先に変換（<rb>内にある場合があるため）
  html = html.replace(/<img[^>]*alt="([^"]*)"[^>]*/gi, (_, alt) => resolveGaiji(alt));

  // 2. <ruby> タグをシンプル形式に整理（プレースホルダーで保護）
  const rubies = [];
  html = html.replace(/<ruby[^>]*>[\s\S]*?<\/ruby>/gi, (match) => {
    const rb = match.match(/<rb>([\s\S]*?)<\/rb>/i);
    const rt = match.match(/<rt>([\s\S]*?)<\/rt>/i);
    if (rb && rt) {
      const idx = rubies.length;
      rubies.push(`<ruby>${rb[1]}<rt>${rt[1]}</rt></ruby>`);
      return `\x00R${idx}\x00`;
    }
    // rbなし形式
    const simple = match.match(/<ruby[^>]*>([\s\S]*?)<rt>([\s\S]*?)<\/rt>[\s\S]*?<\/ruby>/i);
    if (simple) {
      const base = simple[1].replace(/<[^>]+>/g, '').trim();
      const idx = rubies.length;
      rubies.push(`<ruby>${base}<rt>${simple[2]}</rt></ruby>`);
      return `\x00R${idx}\x00`;
    }
    return match.replace(/<[^>]+>/g, '');
  });

  // 3. 残りの HTML タグを除去
  html = html.replace(/<[^>]+>/g, '');

  // 4. HTML エンティティ変換
  html = html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, '\u3000');

  // 5. ルビプレースホルダー復元
  html = html.replace(/\x00R(\d+)\x00/g, (_, i) => rubies[parseInt(i)]);

  // 6. 青空文庫注記除去（［＃...］）
  html = html.replace(/［＃[^］]*］/g, '');

  // 7. 本文を抽出（底本情報の前まで）
  const lines = html.split(/\r?\n/).map(l => l.trim());
  let start = 0;
  let end = lines.length;

  // 本文開始：最初の実質的な行
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 0 && !lines[i].match(/^[-—＿─＊]+$/) && i > 3) {
      start = i;
      break;
    }
  }

  // 本文終了：底本情報の前
  for (let i = lines.length - 1; i > start; i--) {
    if (lines[i].includes('底本') || lines[i].includes('入力者') || lines[i].includes('校正者')) {
      end = i;
      break;
    }
  }

  const body = lines.slice(start, end).filter(l => l.length > 0).join('\n');
  return body.replace(/\n{3,}/g, '\n\n');
}

/** GitHub Raw URL から青空文庫テキストを取得・処理して返す */
export async function fetchAozoraText(url) {
  const rawUrl = toRawUrl(url);
  const resp = await fetch(rawUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${rawUrl}`);
  const buf = await resp.arrayBuffer();
  return processAozoraHtml(buf);
}
