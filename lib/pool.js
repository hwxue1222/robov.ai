function validatePool(value) {
  const text = v => v && typeof v.zh === 'string' && v.zh.trim() && v.zh.length <= 600 && typeof v.en === 'string' && v.en.trim() && v.en.length <= 1000;
  if (!Array.isArray(value) || value.length < 4 || value.length > 10) throw new Error('Invalid pool size');
  const kinds = new Set(['topic', 'person', 'event', 'timeline']);
  const channels = new Set(['science', 'history', 'culture', 'practice']);
  const entries = value.map(entry => {
    if (!kinds.has(entry.kind) || !channels.has(entry.channel) || !text(entry.title) || !text(entry.body)) throw new Error('Invalid pool entry');
    return { kind: entry.kind, channel: entry.channel, title: entry.title, body: entry.body };
  });
  if (new Set(entries.map(e => e.kind)).size < 3 || new Set(entries.map(e => e.channel)).size < 2) throw new Error('Pool lacks variety');
  if (new Set(entries.map(e => e.title.en.toLowerCase())).size !== entries.length) throw new Error('Duplicate pool entries');
  return entries;
}
if (typeof module !== 'undefined') module.exports = { validatePool };
