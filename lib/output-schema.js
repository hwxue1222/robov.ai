const text = { type: 'object', properties: { zh: { type: 'string', minLength: 1, maxLength: 180 }, en: { type: 'string', minLength: 1, maxLength: 350 } }, required: ['zh', 'en'], additionalProperties: false };
const id = { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,80}$' };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const focusedGraphSchema = object({
  domains: { type: 'array', minItems: 3, maxItems: 3, items: object({ id, title: text, summary: text }) },
  nodes: { type: 'array', minItems: 9, maxItems: 9, items: object({ id, domain: id, parent: { anyOf: [id, { type: 'null' }] }, title: text, body: text, why: text, exercise: text, boundary: text }) },
  edges: { type: 'array', minItems: 2, maxItems: 4, items: object({ from: id, to: id, reason: text }) },
  next: object({ id, reason: text }),
  profile: object({ goal: text, start: text, time: text })
});
module.exports = { focusedGraphSchema };
