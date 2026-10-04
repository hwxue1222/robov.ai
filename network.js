const networks = Object.create(null);
let selectedNode = '';
function getNetwork() { return networks[activeTopic] || []; }
function selectNode(id) {
  const node = getNetwork().find(n => n.id === id);
  if (!node) return;
  selectedNode = id;
  $('#topic-title').textContent = node.title;
  $('#topic-summary').textContent = topics[activeTopic].summary;
  $('#topic-boundary').textContent = node.boundary;
  $('#confidence').textContent = '第 ' + (node.depth + 1) + ' 段';
  $('#learning > .eyebrow').textContent = '学习阶段 ' + (node.depth + 1) + ' · 约 3 分钟';
  $('#reflection').value = reflections[reflectionKey(id)] || '';
  $('#node-detail').replaceChildren();
  const title = document.createElement('h3'), body = document.createElement('p');
  title.textContent = node.title; body.textContent = node.body; $('#node-detail').append(title, body);
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
  requestAnimationFrame(drawEdges);
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
