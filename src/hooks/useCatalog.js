import { useState, useEffect, useRef } from 'react';
import { fetchCatalog } from '../utils/catalogParser.js';

let _catalogCache = null; // セッション内メモリキャッシュ

/**
 * 青空文庫カタログ（全作品）を取得するフック
 * セッション内キャッシュあり。検索タブを開いた時点で遅延ロード。
 */
export function useCatalog(enabled = false) {
  const [catalog, setCatalog] = useState(_catalogCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled || fetchedRef.current) return;
    if (_catalogCache) { setCatalog(_catalogCache); return; }

    fetchedRef.current = true;
    setLoading(true);

    fetchCatalog()
      .then(works => {
        _catalogCache = works;
        setCatalog(works);
        setLoading(false);
      })
      .catch(err => {
        setError('カタログの取得に失敗しました');
        setLoading(false);
      });
  }, [enabled]);

  return { catalog, loading, error };
}

/**
 * カタログから作品を検索
 * @param {string} query
 * @param {Array} catalog
 * @param {number} limit
 */
export function searchCatalog(query, catalog, limit = 50) {
  if (!catalog || !query.trim()) return [];
  const q = query.trim();
  const results = [];
  for (const w of catalog) {
    if (
      w.title.includes(q) ||
      w.yomi.includes(q) ||
      w.author.includes(q) ||
      w.authorYomi.includes(q)
    ) {
      results.push(w);
      if (results.length >= limit) break;
    }
  }
  return results;
}
