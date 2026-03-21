/**
 * Vercel API Route: 青空文庫 XHTML プロキシ
 * GitHub Raw から Shift-JIS バイナリを取得してそのまま返す（CORS 回避）
 */
export default async function handler(req, res) {
  const { url } = req.query;

  // GitHub Raw の青空文庫リポジトリ以外は拒否
  if (!url || !url.startsWith('https://raw.githubusercontent.com/aozorabunko/')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) return res.status(upstream.status).end();

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
