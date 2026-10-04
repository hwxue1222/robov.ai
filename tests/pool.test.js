const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePool } = require('../lib/pool');
const knowledge = require('../api/knowledge');
const research = require('../api/research');
const text = { zh: '历史知识线索', en: 'Historical knowledge lead' };
const entries = ['topic', 'person', 'event', 'timeline'].map((kind, i) => ({ kind, channel: i % 2 ? 'history' : 'science', title: { zh: text.zh + i, en: text.en + i }, body: text, referenceTitle: 'Reference ' + i }));

test('pool requires bilingual variety and strips unverified links', () => {
  assert.equal(validatePool(entries).length, 4);
  assert.throws(() => validatePool(entries.map(e => ({ ...e, kind: 'topic' }))));
  assert.throws(() => validatePool(entries.map(e => ({ ...e, body: { zh: '缺少英文' } }))));
  assert.equal(validatePool(entries.map(e => ({ ...e, url: 'https://invented.invalid' })))[0].url, undefined);
});

test('pool generation uses a distinct contract and real research metadata stays separate', async () => {
  const oldFetch = global.fetch, oldKey = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = 'test-only';
  let status, payload;
  const res = { setHeader() {}, status(code) { status = code; return this; }, json(value) { payload = value; } };
  try {
    global.fetch = async (url, options) => {
      if (url instanceof URL && url.hostname === 'en.wikipedia.org') return { ok: true, json: async () => ({ query: { pages: Object.fromEntries(entries.slice(1).map((entry, i) => [i + 1, { pageid: i + 1, ns: 0, title: entry.referenceTitle }])) } }) };
      const request = JSON.parse(JSON.parse(options.body).messages[1].content);
      assert.equal(request.mode, 'pool'); assert.equal(request.requiredStructure, undefined);
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ entries }) } }] }) };
    };
    await knowledge({ method: 'POST', body: { mode: 'pool', description: 'I want to learn coffee extraction.', focus: { id: 'n1', title: text, body: text } } }, res);
    assert.equal(status, 200); assert.equal(payload.entries.length, 4);
    assert.match(payload.entries[1].sourceUrl, /^https:\/\/en.wikipedia.org\/wiki\//);
    global.fetch = async url => {
      assert.equal(url.hostname, 'api.crossref.org');
      return { ok: true, json: async () => ({ message: { items: [{ title: ['Real title'], DOI: '10.1234/example', publisher: 'Publisher', published: { 'date-parts': [[2024]] } }, { title: ['No DOI'] }] } }) };
    };
    await research({ method: 'GET', query: { q: 'coffee extraction' } }, res);
    assert.equal(status, 200); assert.equal(payload.articles.length, 1);
    assert.equal(payload.articles[0].url, 'https://doi.org/10.1234/example');
    assert.equal(payload.articles[0].year, '2024');
  } finally { global.fetch = oldFetch; if (oldKey === undefined) delete process.env.AI_GATEWAY_API_KEY; else process.env.AI_GATEWAY_API_KEY = oldKey; }
});
