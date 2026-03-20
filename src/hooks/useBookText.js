import { useState, useEffect } from 'react';
import { fetchAozoraText } from '../utils/aozoraParser.js';

const CACHE_PREFIX = 'bunko_text_';
const MAX_CACHED_BOOKS = 30;

function getCacheKey(bookId) {
  return CACHE_PREFIX + bookId;
}

function readCache(bookId) {
  try {
    const raw = localStorage.getItem(getCacheKey(bookId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(bookId, text) {
  try {
    // LRU: 上限を超えたら最古エントリを削除
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    if (keys.length >= MAX_CACHED_BOOKS) {
      // savedAt が最も古いものを削除
      let oldest = null, oldestTime = Infinity;
      keys.forEach(k => {
        try {
          const { savedAt } = JSON.parse(localStorage.getItem(k));
          if (savedAt < oldestTime) { oldestTime = savedAt; oldest = k; }
        } catch {}
      });
      if (oldest) localStorage.removeItem(oldest);
    }
    localStorage.setItem(getCacheKey(bookId), JSON.stringify({ text, savedAt: Date.now() }));
  } catch {
    // localStorage 容量不足は無視
  }
}

/**
 * 青空文庫テキストを動的取得するフック
 * キャッシュ: localStorage（最大30作品）
 * @param {{ id, url }} book
 * @returns {{ text: string|null, loading: boolean, error: string|null }}
 */
export function useBookText(book) {
  const [state, setState] = useState({ text: null, loading: false, error: null });

  useEffect(() => {
    if (!book) {
      setState({ text: null, loading: false, error: null });
      return;
    }

    // キャッシュ確認
    const cached = readCache(book.id);
    if (cached) {
      setState({ text: cached.text, loading: false, error: null });
      return;
    }

    if (!book.url) {
      setState({ text: null, loading: false, error: 'no_url' });
      return;
    }

    setState({ text: null, loading: true, error: null });

    let cancelled = false;
    fetchAozoraText(book.url)
      .then(text => {
        if (cancelled) return;
        writeCache(book.id, text);
        setState({ text, loading: false, error: null });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ text: null, loading: false, error: 'network' });
      });

    return () => { cancelled = true; };
  }, [book?.id, book?.url]);

  return state;
}

/** キャッシュ済み書籍IDリストを返す */
export function getCachedBookIds() {
  return Object.keys(localStorage)
    .filter(k => k.startsWith(CACHE_PREFIX))
    .map(k => k.slice(CACHE_PREFIX.length));
}

/** 特定書籍のキャッシュを削除 */
export function removeCachedBook(bookId) {
  localStorage.removeItem(getCacheKey(bookId));
}
