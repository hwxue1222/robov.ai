module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const query = typeof req.query?.q === 'string' ? req.query.q : '';
  if (query.length < 3 || query.length > 80) return res.status(400).json({ error: 'INVALID_QUERY' });
  const search = query.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();
  if (search.length < 3) return res.status(400).json({ error: 'INVALID_QUERY' });
  try {
    const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
    url.search = new URLSearchParams({ query: search, mode: 'artlist', format: 'json', maxrecords: '8', sort: 'datedesc', timespan: '1month' }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('News unavailable');
    const data = await response.json();
    const seen = new Set();
    const articles = (Array.isArray(data.articles) ? data.articles : []).filter(article => {
      if (typeof article.title !== 'string' || article.title.length > 400 || typeof article.url !== 'string') return false;
      try {
        const link = new URL(article.url);
        if (!['http:', 'https:'].includes(link.protocol) || link.username || link.password || seen.has(link.href)) return false;
        seen.add(link.href); return true;
      } catch { return false; }
    }).slice(0, 8).map(article => ({ title: article.title, url: article.url, source: new URL(article.url).hostname, indexedAt: typeof article.seendate === 'string' ? article.seendate : '', language: article.language || '' }));
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({ articles });
  } catch { res.setHeader('Cache-Control', 'no-store'); return res.status(503).json({ error: 'NEWS_UNAVAILABLE' }); }
};
