const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/news');

test('news uses real source metadata, rejects unsafe links and reports failures', async () => {
  const oldFetch = global.fetch;
  let status, payload;
  const res = { setHeader() {}, status(code) { status = code; return this; }, json(value) { payload = value; } };
  try {
    await handler({ method: 'POST' }, res); assert.equal(status, 405);
    await handler({ method: 'GET', query: { q: 'x' } }, res); assert.equal(status, 400);
    global.fetch = async url => {
      assert.equal(url.hostname, 'api.gdeltproject.org');
      return { ok: true, json: async () => ({ articles: [
        { title: 'Example headline', url: 'https://example.org/news', seendate: '20261004T120000Z' },
        { title: 'Unsafe', url: 'javascript:alert(1)' },
        { title: 'Duplicate', url: 'https://example.org/news' }
      ] }) };
    };
    await handler({ method: 'GET', query: { q: 'coffee' } }, res);
    assert.equal(status, 200); assert.equal(payload.articles.length, 1);
    assert.equal(payload.articles[0].source, 'example.org');
    global.fetch = async () => { throw new Error('Unavailable'); };
    await handler({ method: 'GET', query: { q: 'coffee' } }, res);
    assert.equal(status, 503); assert.equal(payload.error, 'NEWS_UNAVAILABLE');
  } finally { global.fetch = oldFetch; }
});
