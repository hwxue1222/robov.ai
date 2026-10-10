let generating = false;
const networkTrail = [];
const networkForward = [];
const errors = {
  MODEL_NOT_CONFIGURED: ['服务暂不可用，请稍后再试。你的描述已保留。', 'The service is temporarily unavailable. Please retry later; your description has been kept.'],
  MODEL_AUTH_REQUIRED: ['服务暂不可用，请稍后再试。你的描述已保留。', 'The service is temporarily unavailable. Please retry later; your description has been kept.'],
  MODEL_CREDITS_REQUIRED: ['服务暂不可用，请稍后再试。你的描述和记录已保留。', 'The service is temporarily unavailable. Please retry later; your description and history are preserved.'],
  MODEL_BUSY: ['请稍后再试。你的描述和记录已保留。', 'Please try again shortly. Your description and history are preserved.']
};
function localText(value) {
  if (typeof value === 'string') return value;
  english[value.zh] = value.en;
  if (value.ms) malay[value.zh] = value.ms;
  return value.zh;
}
function registerGraph(graph) {
  if (graph.poolVersion !== 3) { delete graph.pools; delete graph.poolSearch; }
  if (graph.pools && typeof graph.pools === 'object') {
    for (const id of Object.keys(graph.pools)) {
      try { graph.pools[id] = validatePool(graph.pools[id]); }
      catch { delete graph.pools[id]; }
    }
  } else delete graph.pools;
  normalizeRecommendation(graph);
  const register = value => {
    if (value && typeof value === 'object') {
      if (typeof value.zh === 'string' && typeof value.en === 'string') { english[value.zh] = value.en; if (value.ms) malay[value.zh] = value.ms; }
      else Object.values(value).forEach(register);
    }
  };
  register(graph); personalizedGraph = graph;
  Object.keys(topics).forEach(id => delete topics[id]); Object.keys(networks).forEach(id => delete networks[id]);
  graph.domains.forEach((domain, i) => {
    topics[domain.id] = { title: domain.title.zh, summary: domain.summary.zh, adjacent: graph.domains[(i + 1) % graph.domains.length].id };
    const rows = graph.nodes.filter(n => n.domain === domain.id);
    const depth = n => n.parent === null ? 0 : 1 + depth(rows.find(p => p.id === n.parent));
    networks[domain.id] = rows.map(n => ({ ...n, title: n.title.zh, body: n.body.zh, why: n.why.zh, exercise: n.exercise.zh, boundary: n.boundary.zh, depth: depth(n), index: rows.filter(c => c.parent === n.parent).findIndex(c => c.id === n.id) }));
  });
}
async function requestGraph(payload) {
  const response = await fetch('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, language }), signal: AbortSignal.timeout(115000) });
  const result = await response.json();
  if (!response.ok || !result.graph) throw new Error(result.error || 'MODEL_UNAVAILABLE');
  return validateGraph(result.graph, payload.node || null, 18, (payload.existing || []).map(n => n.id));
}
function setBusy(value) {
  generating = value;
  ['#intro-form button', '#extend-node', '#widen-node', '#recenter-node', '#complete-learning'].forEach(selector => {
    $(selector).disabled = value;
    $(selector).setAttribute('aria-busy', String(value));
  });
  $('#intro-form').setAttribute('aria-busy', String(value));
  $('#return-network').disabled = value;
  $('#forward-network').disabled = value;
  $('#back-node').disabled = value;
}
function generationError(error) {
  const pair = errors[error.message] || ['暂时未能生成知识网络，请重试。你的描述和记录已保留。', 'Could not generate the knowledge network. Please retry; your description and history are preserved.'];
  return localText({ zh: pair[0], en: pair[1] });
}
async function generateNetwork(input, focus = null) {
  if (generating) return;
  if (input.length < 10) { $('#intro-error').textContent = '再多说一点吧，至少 10 个字，让我更了解你的起点。'; return; }
  setBusy(true);
  $('#intro-error').textContent = '';
  $('#network-error').textContent = '';
  try {
    const graph = await requestGraph({ description: input, focus, reflection: focus ? reflections[reflectionKey(focus.id)] || '' : '', history: Object.values(knowledgeVisits).sort((a, b) => b.lastAt - a.lastAt).slice(0, 12) });
    if (focus) {
    const source = personalizedGraph.nodes.find(n => n.id === focus.id) || personalizedGraph.nodes.find(n => n.id === selectedNode);
      networkTrail.push({ graph: personalizedGraph, selectedNode: source.id, activeMode });
      graph.originTitle = focus.title;
      graph.baseDepth = (personalizedGraph.baseDepth || 0) + (networks[source.domain].find(n => n.id === source.id)?.depth || 0);
    } else if (personalizedGraph) {
      networkTrail.push({ graph: personalizedGraph, selectedNode, activeMode });
    }
    networkForward.length = 0;
    description = input; graph.sessionId = crypto.randomUUID(); registerGraph(graph);
    const next = graph.nodes.find(n => n.id === graph.next.id);
    activeMode = 'deeper'; setTopic(next.domain, next.id); renderLivingProfile(); showScreen('learning');
    $('#learning-feedback').textContent = graph.next.reason.zh;
    $('#intro-error').textContent = ''; saveProgress();
  } catch (error) { $(focus ? '#network-error' : '#intro-error').textContent = generationError(error); saveProgress(); }
  finally { setBusy(false); }
}
function returnToNetwork() {
  if (generating || !networkTrail.length) return;
  networkForward.push({ graph: personalizedGraph, selectedNode, activeMode });
  const previous = networkTrail.pop();
  restoreNetwork(previous);
}
function forwardToNetwork() {
  if (generating || !networkForward.length) return;
  networkTrail.push({ graph: personalizedGraph, selectedNode, activeMode });
  restoreNetwork(networkForward.pop());
}
function restoreNetwork(previous) {
  registerGraph(previous.graph); activeMode = previous.activeMode;
  const node = personalizedGraph.nodes.find(n => n.id === previous.selectedNode) || personalizedGraph.nodes.find(n => n.id === personalizedGraph.next.id);
  setTopic(node.domain, node.id); showScreen('learning'); saveProgress();
}
async function generateBranches(node, direction) {
  setBusy(true); $('#learning-feedback').textContent = '';
  try {
    const branch = await requestGraph({ description, node, direction, reflection: reflections[reflectionKey(node.id)] || '', existing: personalizedGraph.nodes.map(n => ({ id: n.id, title: n.title })), history: Object.values(knowledgeVisits).sort((a, b) => b.lastAt - a.lastAt).slice(0, 12) });
    if (branch.nodes.some(n => personalizedGraph.nodes.some(old => old.id === n.id))) throw new Error('DUPLICATE_NODE');
    const currentDomain = activeTopic, currentId = selectedNode;
    registerGraph(validateGraph({ ...personalizedGraph, domains: [...personalizedGraph.domains, ...branch.domains], nodes: [...personalizedGraph.nodes, ...branch.nodes], edges: [...personalizedGraph.edges, ...branch.edges], next: branch.next }, null, 168));
    setTopic(currentDomain, currentId); saveProgress(); $('#learning-feedback').textContent = branch.next.reason.zh;
    if (currentId === node.id) $('#branch-choices').scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) { $('#learning-feedback').textContent = generationError(error); }
  finally { setBusy(false); }
}
