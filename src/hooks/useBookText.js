import { useState, useEffect } from 'react';
import { fetchAozoraHtml } from '../utils/aozoraParser.js';

const CACHE_PREFIX    = 'bunko_html_v22_'; // HTML形式キャッシュ（v22: div タグを br に変換して縦書き影響を排除）
const MAX_CACHED_BOOKS = 30;

// 旧バージョンのキャッシュをすべて削除
(()=>{
  try {
    Object.keys(localStorage)
      .filter(k => ['bunko_text_','bunko_html_v1_','bunko_html_v2_','bunko_html_v3_','bunko_html_v4_','bunko_html_v5_','bunko_html_v6_','bunko_html_v7_','bunko_html_v8_','bunko_html_v9_','bunko_html_v10_','bunko_html_v11_','bunko_html_v12_','bunko_html_v13_','bunko_html_v14_','bunko_html_v15_','bunko_html_v16_','bunko_html_v17_','bunko_html_v18_','bunko_html_v19_','bunko_html_v20_','bunko_html_v21_'].some(p => k.startsWith(p)))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
})();

function readCache(bookId) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + bookId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(bookId, html) {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    if (keys.length >= MAX_CACHED_BOOKS) {
      let oldest = null, oldestTime = Infinity;
      keys.forEach(k => {
        try {
          const { savedAt } = JSON.parse(localStorage.getItem(k));
          if (savedAt < oldestTime) { oldestTime = savedAt; oldest = k; }
        } catch {}
      });
      if (oldest) localStorage.removeItem(oldest);
    }
    localStorage.setItem(CACHE_PREFIX + bookId, JSON.stringify({ html, savedAt: Date.now() }));
  } catch {}
}

/**
 * 青空文庫 HTML フラグメントを取得するフック
 * @returns {{ html: string|null, loading: boolean, error: string|null }}
 */
export function useBookText(book) {
  const [state, setState] = useState({ html: null, loading: false, error: null });

  useEffect(() => {
    if (!book) { setState({ html: null, loading: false, error: null }); return; }

    const cached = readCache(book.id);
    if (cached) { setState({ html: cached.html, loading: false, error: null }); return; }

    if (!book.url) { setState({ html: null, loading: false, error: 'no_url' }); return; }

    setState({ html: null, loading: true, error: null });
    let cancelled = false;

    fetchAozoraHtml(book.url)
      .then(html => {
        if (cancelled) return;
        writeCache(book.id, html);
        setState({ html, loading: false, error: null });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ html: null, loading: false, error: 'network' });
      });

    return () => { cancelled = true; };
  }, [book?.id, book?.url]);

  return state;
}
