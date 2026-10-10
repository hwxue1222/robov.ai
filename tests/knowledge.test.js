const test = require('node:test');
const assert = require('node:assert/strict');
const { validateGraph, normalizeRecommendation } = require('../lib/graph');
const handler = require('../api/knowledge');
const text = { zh: '萃取', en: 'Extraction' };
function fixture(count = 2) {
  const domains = ['d1', 'd2', 'd3'].slice(0, count).map(id => ({ id, title: text, summary: text }));
  const nodes = domains.flatMap(d => [null, 1, 2].map(i => ({ id: i ? d.id + '-' + i : d.id, domain: d.id, parent: i ? d.id : null, title: text, body: text, why: text, exercise: text, boundary: text })));
  return structuredClone({ domains, nodes, edges: [{ from: 'd1-1', to: 'd2-1', reason: text }], next: { id: 'd1-1', reason: text }, profile: { goal: text, start: text, time: text } });
}
test('accepts bilingual personalized graphs', () => assert.equal(validateGraph(fixture()).nodes.length, 6));
test('new Malay translations are validated while saved bilingual graphs remain compatible', () => {
  const graph = fixture();
  const addMalay = value => {
    if (!value || typeof value !== 'object') return;
    if (value.zh && value.en) value.ms = 'Pengekstrakan';
    else Object.values(value).forEach(addMalay);
  };
  addMalay(graph);
  assert.equal(validateGraph(graph).nodes[0].title.ms, 'Pengekstrakan');
  graph.nodes[0].title.ms = '';
  assert.throws(() => validateGraph(graph));
});

test('Malay generation rejects missing translations and uses a trilingual prompt', async () => {
  const oldFetch = global.fetch, oldKey = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = 'test-only';
  let status, payload;
  const res = { setHeader() {}, status(value) { status = value; return this; }, json(value) { payload = value; } };
  try {
    global.fetch = async (_url, options) => {
      assert.match(JSON.parse(options.body).messages[0].content, /ms \(Bahasa Melayu\)/);
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(fixture()) } }] }) };
    };
    await handler({ method: 'POST', body: { description: 'I want to understand coffee extraction.', language: 'ms' } }, res);
    assert.equal(status, 502);
    assert.equal(payload.error, 'INVALID_GENERATION');
    const graph = fixture();
    const localize = value => {
      if (!value || typeof value !== 'object') return;
      if (value.zh && value.en) value.ms = 'Pengekstrakan';
      else Object.values(value).forEach(localize);
    };
    localize(graph);
    global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(graph) } }] }) });
    await handler({ method: 'POST', body: { description: 'I want to understand coffee extraction.', language: 'ms' } }, res);
    assert.equal(status, 200);
    assert.equal(payload.graph.nodes[0].title.ms, 'Pengekstrakan');
  } finally { global.fetch = oldFetch; if (oldKey === undefined) delete process.env.AI_GATEWAY_API_KEY; else process.env.AI_GATEWAY_API_KEY = oldKey; }
});
test('rejects missing translations, cycles, unknown edges and duplicate ids', () => {
  for (const mutate of [g => delete g.nodes[1].body.en, g => g.nodes[0].parent = 'd1-1', g => g.edges[0].to = 'absent', g => g.nodes[1].id = 'd1']) {
    const g = fixture(); mutate(g); assert.throws(() => validateGraph(g));
  }
});
test('branches must stay attached to the selected node', () => {
  const g = fixture(), parent = g.nodes[1];
  const branch = { ...g, domains: [], nodes: g.nodes.slice(0, 2).map((n, i) => ({ ...n, id: 'branch-' + i, domain: parent.domain, parent: parent.id })), edges: [], next: { id: 'branch-0', reason: text } };
  assert.equal(validateGraph(branch, parent).nodes.length, 2);
  branch.edges.push({ from: 'branch-0', to: parent.id, reason: text });
  assert.equal(validateGraph(branch, parent).edges.length, 1);
  branch.edges.push({ from: 'branch-1', to: 'existing-node', reason: text });
  assert.throws(() => validateGraph(branch, parent));
  assert.equal(validateGraph(branch, parent, 18, ['existing-node']).edges.length, 2);
  branch.nodes[0].parent = 'unrelated'; assert.throws(() => validateGraph(branch, parent));
});
test('API protects credentials, validates inputs and parses Kimi JSON', async () => {
  const oldFetch = global.fetch, key = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = 'test-only';
  let status, payload;
  const res = { setHeader() {}, status(code) { status = code; return this; }, json(value) { payload = value; return value; } };
  try {
    await handler({ method: 'GET' }, res); assert.equal(status, 405);
    await handler({ method: 'POST', body: { description: 'short' } }, res); assert.equal(status, 400);
    global.fetch = async (url, options) => {
      assert.equal(options.headers.Authorization.includes('test-only'), true);
      assert.match(JSON.parse(options.body).model, /kimi/);
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(fixture()) } }] }) };
    };
    await handler({ method: 'POST', body: { description: 'I want to understand coffee extraction.' } }, res);
    assert.equal(status, 200); assert.equal(payload.graph.nodes.length, 6); assert.equal(JSON.stringify(payload).includes('test-only'), false);
    global.fetch = async (url, options) => {
      const request = JSON.parse(JSON.parse(options.body).messages[1].content);
      assert.equal(request.mode, 'focused-network');
      assert.equal(request.direction, undefined);
      assert.equal(request.requiredStructure.totalNodes, 9);
      assert.equal(request.focus.title.en, 'Extraction');
      assert.equal(JSON.parse(options.body).tool_choice.function.name, 'submit_graph');
      return { ok: true, json: async () => ({ choices: [{ message: { content: null, tool_calls: [{ function: { name: 'submit_graph', arguments: JSON.stringify(fixture(3)) } }] } }] }) };
    };
    await handler({ method: 'POST', body: { description: 'I want to understand coffee extraction.', focus: fixture().nodes[0] } }, res);
    assert.equal(status, 200);
    await handler({ method: 'POST', body: { description: 'I want to understand coffee extraction.', focus: { id: 'bad' } } }, res);
    assert.equal(status, 400);
    global.fetch = async () => ({ ok: false, status: 402 });
    await handler({ method: 'POST', body: { description: 'I want to understand coffee extraction.' } }, res);
    assert.equal(payload.error, 'MODEL_CREDITS_REQUIRED');
  } finally { global.fetch = oldFetch; if (key === undefined) delete process.env.AI_GATEWAY_API_KEY; else process.env.AI_GATEWAY_API_KEY = key; }
});
test('wide exploration creates a connected new domain', () => {
  const g = fixture(), parent = g.nodes[1];
  const wide = { ...g, domains: [g.domains[1]], nodes: g.nodes.filter(n => n.domain === 'd2'), edges: [{ from: parent.id, to: 'd2', reason: text }], next: { id: 'd2-1', reason: text } };
  assert.equal(validateGraph(wide, parent).domains.length, 1);
  wide.nodes[1].parent = 'absent'; assert.throws(() => validateGraph(wide, parent));
});
test('recommendations do not equate viewing with mastering', () => {
  const g = fixture(); g.next.reason = { zh: '你已掌握流体力学，下一步学习传热。', en: 'Having mastered fluid dynamics, explore heat transfer.' };
  normalizeRecommendation(g);
  assert.match(g.next.reason.zh, /^你正在探索/); assert.match(g.next.reason.en, /^As you explore/);
});
