const CATALOG_ZIP_URL = 'https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/index_pages/list_person_all_extended_utf8.zip';
const AOZORA_BASE = 'https://www.aozora.gr.jp/';
const GITHUB_BASE = 'https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/';

/** RFC 4180 CSV の1行をパース（クォート対応） */
function parseCsvLine(line) {
  const cols = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { cols.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

/** 青空文庫 URL → GitHub Raw URL */
function toRawUrl(url) {
  return url.startsWith(AOZORA_BASE) ? url.replace(AOZORA_BASE, GITHUB_BASE) : url;
}

/**
 * カタログ CSV を解析して作品リストを返す
 * @returns {{ id, title, yomi, author, authorYomi, url }[]}
 */
export function parseCatalogCsv(csvText) {
  // BOM 除去
  const text = csvText.replace(/^\uFEFF/, '');
  const lines = text.split('\n');
  const works = [];
  const seen = new Set();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);
    if (cols.length < 51) continue;

    // 著作権あり作品はスキップ
    if (cols[10] !== 'なし') continue;

    const htmlUrl = cols[50];
    if (!htmlUrl || !htmlUrl.includes('aozora.gr.jp')) continue;

    const id = cols[0];
    if (seen.has(id)) continue;
    seen.add(id);

    const sei = cols[15] || '';
    const mei = cols[16] || '';
    const seiYomi = cols[17] || '';
    const meiYomi = cols[18] || '';

    works.push({
      id,
      title:      cols[1],
      yomi:       cols[3],
      author:     sei + (mei ? ' ' + mei : ''),
      authorYomi: seiYomi + meiYomi,
      url:        toRawUrl(htmlUrl),
    });
  }

  return works;
}

/** カタログ ZIP を取得してパース */
export async function fetchCatalog() {
  const resp = await fetch(CATALOG_ZIP_URL);
  if (!resp.ok) throw new Error(`Catalog fetch failed: HTTP ${resp.status}`);

  const buf = await resp.arrayBuffer();

  // fflate で unzip（動的 import で bundle splitting）
  const { unzipSync } = await import('fflate');
  const unzipped = unzipSync(new Uint8Array(buf));
  const csvBytes = Object.values(unzipped)[0];
  const csvText = new TextDecoder('utf-8').decode(csvBytes);

  return parseCatalogCsv(csvText);
}
