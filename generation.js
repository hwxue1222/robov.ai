let generating = false;
const errors = {
  MODEL_NOT_CONFIGURED: ['Kimi 服务尚未配置，请联系管理员连接模型。你的描述已保留。', 'Kimi is not configured yet. Your description has been kept.'],
  MODEL_AUTH_REQUIRED: ['Kimi 服务需要授权，请联系管理员完成模型连接。你的描述已保留。', 'Kimi needs authorization. Your description has been kept.'],
  MODEL_CREDITS_REQUIRED: ['模型服务余额不足，暂时无法生成。你的描述和记录不会丢失。', 'The model service needs credits. Your description and history are preserved.'],
  MODEL_BUSY: ['Kimi 当前繁忙，请稍后再试。', 'Kimi is busy. Please try again shortly.']
};
function localText(value) { return typeof value === 'string' ? value : document.documentElement.lang === 'en' ? value.en : value.zh; }
function registerGraph(graph) {
  const register = value => {
    if (value && typeof value === 'object') {
      if (typeof value.zh === 'string' && typeof value.en === 'string') english[value.zh] = value.en;
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
  const response = await fetch('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(115000) });
  const result = await response.json();
  if (!response.ok || !result.graph) throw new Error(result.error || 'MODEL_UNAVAILABLE');
  return validateGraph(result.graph, payload.node || null);
}
function setBusy(value) {
  generating = value;
  ['#intro-form button', '#extend-node', '#widen', '#complete-learning'].forEach(selector => $(selector).disabled = value);
  $('#intro-form').setAttribute('aria-busy', String(value));
}
function generationError(error) {
  const pair = errors[error.message] || ['暂时未能生成知识网络，请重试。你的描述和记录已保留。', 'Could not generate the knowledge network. Please retry; your description and history are preserved.'];
  return localText({ zh: pair[0], en: pair[1] });
}
async function generateNetwork(input) {
  if (generating) return;
  if (input.length < 10) { $('#intro-error').textContent = '再多说一点吧，至少 10 个字，让我更了解你的起点。'; return; }
  setBusy(true);
  $('#intro-error').textContent = localText({ zh: 'Kimi 正在根据你的描述连接知识点，预计需要 20–60 秒……', en: 'Kimi is connecting ideas from your description. This may take 20–60 seconds…' });
  try {
    const graph = await requestGraph({ description: input, history: Object.values(knowledgeVisits).sort((a, b) => b.lastAt - a.lastAt).slice(0, 12) });
    description = input; graph.sessionId = crypto.randomUUID(); registerGraph(graph);
    const next = graph.nodes.find(n => n.id === graph.next.id);
    activeMode = 'deeper'; setTopic(next.domain, next.id); renderLivingProfile(); showScreen('learning');
    $('#learning-feedback').textContent = graph.next.reason.zh;
    $('#intro-error').textContent = ''; saveProgress();
  } catch (error) { $('#intro-error').textContent = generationError(error); saveProgress(); }
  finally { setBusy(false); }
}
async function generateBranches(node, direction) {
  setBusy(true); $('#learning-feedback').textContent = localText({ zh: 'Kimi 正在生成新的知识方向……', en: 'Kimi is generating new knowledge directions…' });
  try {
    const branch = await requestGraph({ description, node, direction, reflection: reflections[node.id] || '', existing: personalizedGraph.nodes.map(n => ({ id: n.id, title: n.title })), history: Object.values(knowledgeVisits).slice(-12) });
    if (branch.nodes.some(n => personalizedGraph.nodes.some(old => old.id === n.id))) throw new Error('DUPLICATE_NODE');
    registerGraph(validateGraph({ ...personalizedGraph, nodes: [...personalizedGraph.nodes, ...branch.nodes], edges: [...personalizedGraph.edges, ...branch.edges] }, null, 168));
    setTopic(node.domain, node.id); saveProgress(); $('#learning-feedback').textContent = branch.next.reason.zh;
    $('#branch-choices').scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) { $('#learning-feedback').textContent = generationError(error); }
  finally { setBusy(false); }
}
