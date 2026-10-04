function validateGraph(graph, parent = null, maxNodes = 18) {
  const text = value => value && typeof value.zh === 'string' && value.zh.trim() && value.zh.length <= 1500 && typeof value.en === 'string' && value.en.trim() && value.en.length <= 2500;
  const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
  if (!graph || !Array.isArray(graph.domains) || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw new Error('Invalid graph');
  if (graph.nodes.length < (parent ? 2 : 6) || graph.nodes.length > maxNodes || graph.domains.length > 5 || graph.edges.length > maxNodes * 3) throw new Error('Invalid size');
  if (!parent && graph.domains.length < 2) throw new Error('Missing domains');
  if (parent && graph.domains.length) throw new Error('Unexpected domains');
  const domains = new Set(graph.domains.map(d => d.id));
  if (domains.size !== graph.domains.length || !graph.domains.every(d => id(d.id) && text(d.title) && text(d.summary))) throw new Error('Invalid domains');
  const nodes = new Map(graph.nodes.map(n => [n.id, n]));
  if (nodes.size !== graph.nodes.length) throw new Error('Duplicate nodes');
  for (const n of graph.nodes) {
    if (!id(n.id) || !id(n.domain) || !['title', 'body', 'why', 'exercise', 'boundary'].every(k => text(n[k]))) throw new Error('Invalid node');
    if (parent) {
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
  if (!parent && [...domains].some(d => !nodes.has(d) || graph.nodes.filter(n => n.domain === d).length < 2)) throw new Error('Missing roots');
  if (!graph.edges.every(e => (nodes.has(e.from) || e.from === parent?.id) && nodes.has(e.to) && e.from !== e.to && text(e.reason))) throw new Error('Invalid edges');
  if (!nodes.has(graph.next?.id) || !text(graph.next.reason) || !['goal', 'start', 'time'].every(k => text(graph.profile?.[k]))) throw new Error('Invalid recommendation');
  return graph;
}
if (typeof module !== 'undefined') module.exports = { validateGraph };
