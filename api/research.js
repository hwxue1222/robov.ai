module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const query = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
  if (query.length < 3 || query.length > 180) return res.status(400).json({ error: 'INVALID_QUERY' });
  try {
    const url = new URL('https://api.crossref.org/works');
    url.search = new URLSearchParams({ 'query.bibliographic': query, rows: '4', select: 'title,DOI,publisher,published' }).toString();
    const response = await fetch(url, { headers: { 'User-Agent': 'ROBOV/1.0 (https://robov.ai)' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Research unavailable');
    const data = await response.json();
    const seen = new Set();
    const articles = (data.message?.items || []).filter(item => {
      if (typeof item.title?.[0] !== 'string' || item.title[0].length > 600 || typeof item.DOI !== 'string' || !/^10\.\d{4,9}\/\S+$/i.test(item.DOI) || seen.has(item.DOI)) return false;
      seen.add(item.DOI); return true;
    }).map(item => ({ title: item.title[0], url: 'https://doi.org/' + item.DOI, source: typeof item.publisher === 'string' ? item.publisher : 'Crossref', year: Number.isInteger(item.published?.['date-parts']?.[0]?.[0]) ? String(item.published['date-parts'][0][0]) : '' }));
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=3600');
    return res.status(200).json({ articles });
  } catch { res.setHeader('Cache-Control', 'no-store'); return res.status(503).json({ error: 'RESEARCH_UNAVAILABLE' }); }
};
