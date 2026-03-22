import { useState, useEffect } from 'react';
import { fetchAozoraHtml } from '../utils/aozoraParser.js';

// 旧 localStorage キャッシュを一括削除（v33まで）
(()=>{
  try {
    const prefixes = ['bunko_text_',...Array.from({length:33},(_,i)=>`bunko_html_v${i+1}_`)];
    Object.keys(localStorage)
      .filter(k => prefixes.some(p => k.startsWith(p)))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
})();

// ─── IndexedDB キャッシュ ───
const DB_NAME = 'bunko';
const DB_VER  = 3; // v3: ruby → .rw/.rt spans (native ruby が iOS Safari で列幅を広げる問題を修正)
const STORE   = 'html';
const MAX_CACHED_BOOKS = 30;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      // バージョンアップ時は古いキャッシュを削除（HTML形式変更のため）
      if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE);
      db.createObjectStore(STORE, { keyPath: 'bookId' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });
}

async function readCache(bookId) {
  try {
    const db = await openDb();
    return new Promise(resolve => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(bookId);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => resolve(null);
    });
  } catch { return null; }
}

async function writeCache(bookId, html) {
  try {
    const db = await openDb();
    // 上限超えなら最古エントリを削除
    const all = await new Promise(resolve => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror   = () => resolve([]);
    });
    if (all.length >= MAX_CACHED_BOOKS) {
      const oldest = all.sort((a, b) => a.savedAt - b.savedAt)[0];
      await new Promise(resolve => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(oldest.bookId);
        tx.oncomplete = resolve;
      });
    }
    await new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ bookId, html, savedAt: Date.now() });
      tx.oncomplete = resolve;
    });
  } catch {}
}

/** 書庫から本を返すときにキャッシュも削除 */
export async function deleteBookCache(bookId) {
  try {
    const db = await openDb();
    await new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(bookId);
      tx.oncomplete = resolve;
    });
  } catch {}
}

/**
 * 書庫保存時に本文をバックグラウンドでキャッシュする
 * 既にキャッシュ済みの場合は何もしない
 */
export async function precacheBook(bookId, url) {
  const cached = await readCache(bookId);
  if (cached) return;
  try {
    const html = await fetchAozoraHtml(url);
    await writeCache(bookId, html);
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
    if (!book.url) { setState({ html: null, loading: false, error: 'no_url' }); return; }

    let cancelled = false;

    (async () => {
      // キャッシュ確認（IDB は非同期だが通常 < 10ms）
      const cached = await readCache(book.id);
      if (cancelled) return;
      if (cached) { setState({ html: cached.html, loading: false, error: null }); return; }

      // キャッシュなし → ネット取得
      setState({ html: null, loading: true, error: null });
      try {
        const html = await fetchAozoraHtml(book.url);
        if (cancelled) return;
        await writeCache(book.id, html);
        setState({ html, loading: false, error: null });
      } catch {
        if (!cancelled) setState({ html: null, loading: false, error: 'network' });
      }
    })();

    return () => { cancelled = true; };
  }, [book?.id, book?.url]);

  return state;
}
