const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/translate');

test('Malay translation validates input and rejects incomplete or truncated responses', async () => {
  const oldFetch = global.fetch, oldKey = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = 'test-only';
  let status, payload;
  const res = { setHeader() {}, status(value) { status = value; return this; }, json(value) { payload = value; } };
  const req = { method: 'POST', body: { entries: [{ id: 'a', text: 'Knowledge network' }, { id: 'b', text: 'Explore AI' }] } };
  try {
    await handler({ method: 'GET' }, res); assert.equal(status, 405);
    for (const entries of [[], [null], [{ id: 'a', text: ' ' }], [{ id: 'a', text: 'one' }, { id: 'a', text: 'two' }]]) {
      await handler({ method: 'POST', body: { entries } }, res); assert.equal(status, 400);
    }
    global.fetch = async (_url, options) => {
      assert.match(JSON.parse(options.body).messages[0].content, /Bahasa Melayu/);
      assert.equal(options.headers.Authorization, 'Bearer test-only');
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ entries: [{ id: 'b', ms: 'Teroka AI' }, { id: 'a', ms: 'Rangkaian ilmu' }] }) } }] }) };
    };
    await handler(req, res); assert.equal(status, 200); assert.equal(payload.entries[0].ms, 'Teroka AI');
    assert(!JSON.stringify(payload).includes('test-only'));
    for (const content of [{ entries: [{ id: 'a', ms: 'Rangkaian ilmu' }] }, { entries: [{ id: 'a', ms: '' }, { id: 'b', ms: 'Teroka AI' }] }, { entries: [{ id: 'a', ms: 'Satu' }, { id: 'wrong', ms: 'Dua' }] }]) {
      global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }) });
      await handler(req, res); assert.equal(status, 502);
    }
    global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] }) });
    await handler(req, res); assert.equal(status, 502);
    global.fetch = async () => ({ ok: false });
    await handler(req, res); assert.equal(status, 503);
  } finally { global.fetch = oldFetch; if (oldKey === undefined) delete process.env.AI_GATEWAY_API_KEY; else process.env.AI_GATEWAY_API_KEY = oldKey; }
});
