const networks = Object.create(null);
let selectedNode = '';
let selectedSession = '';
let restoringNode = false;
const nodeHistory = Object.create(null);
function getNetwork() { return networks[activeTopic] || []; }
function selectNode(id) {
  const node = getNetwork().find(n => n.id === id);
  if (!node) return;
  const trail = nodeHistory[personalizedGraph.sessionId] ||= [];
  if (!restoringNode && selectedSession === personalizedGraph.sessionId && selectedNode && selectedNode !== id) trail.push(selectedNode);
  selectedNode = id; selectedSession = personalizedGraph.sessionId;
  $('#network-error').textContent = '';
  $('#reflection').value = reflections[reflectionKey(id)] || '';
  $('#node-detail').replaceChildren();
  const title = document.createElement('h2'); title.tabIndex = -1;
  title.textContent = node.title; $('#node-detail').append(title);
  $('#node-path').replaceChildren();
  const path = []; let current = node;
  while (current && path.length < 20) { path.unshift(current); current = getNetwork().find(n => n.id === current.parent); }
  path.forEach((n, i) => {
    if (i) $('#node-path').append(document.createTextNode(' / '));
    const b = document.createElement('button'); b.className = 'text-button'; b.textContent = n.title;
    b.addEventListener('click', () => { selectNode(n.id); renderNetwork(); }); $('#node-path').append(b);
  });
  $('#branch-choices').replaceChildren();
  const children = getNetwork().filter(n => n.parent === id);
  const links = (personalizedGraph?.edges || []).filter(e => e.from === id || e.to === id);
  const candidates = [...new Set([...children.map(n => n.id), ...links.map(e => e.from === id ? e.to : e.from)])];
  candidates.forEach(childId => {
    const raw = personalizedGraph.nodes.find(n => n.id === childId);
    if (!raw) return;
    const b = document.createElement('button'); b.className = 'branch-choice'; b.textContent = raw.title.zh + ' →';
    const edge = links.find(e => e.from === childId || e.to === childId); if (edge) b.title = localText(edge.reason);
    b.addEventListener('click', () => { activeMode = 'deeper'; setTopic(raw.domain, raw.id); $('#node-detail').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    $('#branch-choices').append(b);
  });
  $('#learning-feedback').textContent = '';
  setMode(activeMode);
  if (!$('#learning').hidden) recordKnowledge(id);
}
function renderNetwork() {
  const nodes = getNetwork();
  $('#return-network').hidden = !networkTrail.length;
  $('#forward-network').hidden = !networkForward.length;
  $('#back-node').hidden = !(nodeHistory[personalizedGraph.sessionId]?.length);
  $('#network-origin').textContent = personalizedGraph.originTitle ? localText({ zh: '起点：' + personalizedGraph.originTitle.zh, en: 'Starting point: ' + personalizedGraph.originTitle.en }) : '';
  $('#knowledge-network').replaceChildren();
  Object.keys(networks).forEach(domain => {
    const row = document.createElement('div'); row.className = 'network-row';
    networks[domain].forEach(node => {
      const b = document.createElement('button'); b.className = 'knowledge-point'; b.dataset.node = node.id; b.textContent = node.title;
      b.setAttribute('aria-pressed', String(node.id === selectedNode));
      b.addEventListener('click', () => setTopic(domain, node.id)); row.append(b);
    }); $('#knowledge-network').append(row);
  });
  if (nodes.length) $('#network-guidance').textContent = '已连接 ' + personalizedGraph.nodes.length + ' 个知识点。当前知识点：' + nodes.find(n => n.id === selectedNode).title;
  $('#next-direction').replaceChildren();
  const next = personalizedGraph.nodes.find(n => n.id === personalizedGraph.next.id);
  const label = document.createElement('span'); label.className = 'eyebrow'; label.textContent = 'NEXT BEST KNOWLEDGE';
  const button = document.createElement('button'); button.className = 'text-button'; button.textContent = next.title.zh + ' →';
  button.addEventListener('click', () => { setTopic(next.domain, next.id); $('#node-detail').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  const reason = document.createElement('p'); reason.textContent = personalizedGraph.next.reason.zh;
  $('#next-direction').append(label, button, reason);
  renderPool();
  requestAnimationFrame(drawEdges);
}
function backToNode() {
  if (generating) return;
  const trail = nodeHistory[personalizedGraph.sessionId] || [];
  const node = personalizedGraph.nodes.find(n => n.id === trail.pop());
  if (!node) return;
  restoringNode = true;
  try { setTopic(node.domain, node.id); } finally { restoringNode = false; }
  $('#node-detail').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function drawEdges() { window.robovScene?.sync(); }
async function extendNode(direction = 'deeper') {
  if (generating || !personalizedGraph) return;
  const node = personalizedGraph.nodes.find(n => n.id === selectedNode);
  if (!node) return;
  if (personalizedGraph.nodes.length >= 150) {
    $('#learning-feedback').textContent = localText({ zh: '当前网络已达到 150 个知识点。可以更新描述，重新整理下一步方向。', en: 'This network has reached 150 ideas. Update your description to organize a new direction.' }); return;
  }
  await generateBranches(node, direction);
}
