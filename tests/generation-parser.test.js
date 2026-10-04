const test = require('node:test');
const assert = require('node:assert/strict');
const { parseGeneration } = require('../lib/generation-parser');

test('generation parsing repairs syntax without replacing content', () => {
  assert.deepEqual(parseGeneration("```json\n{title: 'A real concept',}\n```", 'stop'), { title: 'A real concept' });
  assert.deepEqual(parseGeneration('{"body":"The "grinding" process"}', 'tool_calls'), { body: 'The "grinding" process' });
  assert.deepEqual(parseGeneration(JSON.stringify(JSON.stringify({ title: 'Nested encoding' })), 'tool_calls'), { title: 'Nested encoding' });
});
test('truncated generations are never repaired into apparently complete graphs', () => {
  assert.throws(() => parseGeneration('{"nodes": [', 'length'), /Truncated/);
  assert.throws(() => parseGeneration(null, 'stop'), /Invalid generation/);
});
