const { jsonrepair } = require('../vendor/jsonrepair/jsonrepair.min.js');

function parseGeneration(content, finishReason) {
  if (finishReason === 'length') throw new Error('Truncated generation');
  if (typeof content !== 'string' || content.length > 100000) throw new Error('Invalid generation content');
  const parse = source => {
    try { return JSON.parse(source); }
    catch { return JSON.parse(jsonrepair(source)); }
  };
  let value = parse(content);
  if (typeof value === 'string') value = parse(value);
  return value;
}
module.exports = { parseGeneration };
