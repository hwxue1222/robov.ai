function validateGraph(graph, parent = null, maxNodes = 18, existingIds = []) {
  const text = value => value && typeof value.zh === 'string' && value.zh.trim() && value.zh.length <= 1500 && typeof value.en === 'string' && value.en.trim() && value.en.length <= 2500 && (value.ms === undefined || (typeof value.ms === 'string' && value.ms.trim() && value.ms.length <= 2500));
  const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
  if (!graph || !Array.isArray(graph.domains) || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw new Error('Invalid graph');
  if (graph.nodes.length < (parent ? 2 : 6) || graph.nodes.length > maxNodes || graph.domains.length > 30 || graph.edges.length > maxNodes * 3) throw new Error('Invalid size');
  if (!parent && graph.domains.length < 2) throw new Error('Missing domains');
  const domains = new Set(graph.domains.map(d => d.id));
  if (domains.size !== graph.domains.length || !graph.domains.every(d => id(d.id) && text(d.title) && text(d.summary))) throw new Error('Invalid domains');
  const nodes = new Map(graph.nodes.map(n => [n.id, n]));
  if (nodes.size !== graph.nodes.length) throw new Error('Duplicate nodes');
  for (const n of graph.nodes) {
    const invalidFields = ['id', 'domain'].filter(k => !id(n[k])).concat(['title', 'body', 'why', 'exercise', 'boundary'].filter(k => !text(n[k])));
    if (invalidFields.length) throw new Error('Invalid node fields: ' + invalidFields.join(', '));
    if (parent && !domains.has(n.domain)) {
      if (n.parent !== parent.id || n.domain !== parent.domain || n.id === parent.id) throw new Error('Invalid branch');
    } else {
      if (!domains.has(n.domain)) throw new Error('Unknown domain');
      if (n.parent === null ? n.id !== n.domain : !nodes.has(n.parent) || n.parent === n.id || nodes.get(n.parent).domain !== n.domain) throw new Error('Invalid parent');
      const visited = new Set([n.id]);
      let ancestor = n;
      while (ancestor.parent !== null) {
        if (visited.has(ancestor.parent)) throw new Error('Cycle');
        visited.add(ancestor.parent); ancestor = nodes.get(ancestor.parent);
        if (!ancestor) throw new Error('Orphan');
      }
    }
  }
  if ([...domains].some(d => !nodes.has(d) || graph.nodes.filter(n => n.domain === d).length < 2)) throw new Error('Missing roots');
  const references = new Set([...nodes.keys(), ...(parent ? [parent.id, ...existingIds] : [])]);
  if (!graph.edges.every(e => references.has(e.from) && references.has(e.to) && e.from !== e.to && text(e.reason))) throw new Error('Invalid edges');
  if (!nodes.has(graph.next?.id) || !text(graph.next.reason) || !['goal', 'start', 'time'].every(k => text(graph.profile?.[k]))) throw new Error('Invalid recommendation');
  return graph;
}
function normalizeRecommendation(graph) {
  // Visiting a node is exploration, never evidence of mastery.
  graph.next.reason.zh = graph.next.reason.zh.replace(/^你(?:已|已经)掌握/, '你正在探索');
  graph.next.reason.en = graph.next.reason.en.replace(/^Having mastered\b/i, 'As you explore').replace(/^You have (?:already )?mastered\b/i, 'You are exploring');
  return graph;
}
if (typeof module !== 'undefined') module.exports = { validateGraph, normalizeRecommendation };
