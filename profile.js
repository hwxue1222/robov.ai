const progressKey = 'robov-progress-v1';
const knowledgeVisits = Object.create(null);
let lastVisit = '';
function saveProgress() {
  try {
    localStorage.setItem(progressKey, JSON.stringify({ version: 2, description, activeTopic, activeMode, selectedNode, graph: personalizedGraph, networkTrail, networkForward, nodeHistory, reflections, knowledgeVisits, draft: $('#self-description').value }));
  } catch { $('#profile-storage').textContent = '探索记录不等于已掌握。当前浏览器无法保存记录，本次关闭页面后进度将丢失。'; }
}
function recordKnowledge(id) {
  const node = getNetwork().find(n => n.id === id);
  if (!node) return;
  const key = personalizedGraph.sessionId + ':' + id;
  if (lastVisit !== key) {
    knowledgeVisits[key] = { title: node.title, topic: topics[activeTopic].title, depth: node.depth + (personalizedGraph.baseDepth || 0), count: (knowledgeVisits[key]?.count || 0) + 1, lastAt: Date.now() }; lastVisit = key;
  }
  renderLivingProfile(); saveProgress();
}
function renderLivingProfile() {
  const visits = Object.values(knowledgeVisits);
  $('#open-profile').hidden = !description;
  $('#live-summary').textContent = personalizedGraph ? '你目前关注「' + topics[activeTopic].title + '」。这份画像会随着你的自我描述和知识探索持续更新。' : '';
  $('#live-description').textContent = '你说：「' + description + '」';
  $('#signal-interests').replaceChildren();
  Object.values(topics).forEach((topic, i) => {
    if (i) $('#signal-interests').append(document.createTextNode(' / '));
    const span = document.createElement('span'); span.textContent = topic.title; $('#signal-interests').append(span);
  });
  ['goal', 'time', 'start'].forEach(k => $('#signal-' + k).textContent = personalizedGraph?.profile[k].zh || '尚未提供');
  const breadth = new Set(visits.map(v => v.topic)).size, depth = Math.max(0, ...visits.map(v => v.depth));
  $('#live-breadth').textContent = String(breadth); $('#live-depth').textContent = String(depth); $('#live-count').textContent = String(visits.length);
  $('#resume-learning').hidden = !personalizedGraph;
  $('#profile-history').replaceChildren();
  visits.sort((a, b) => b.lastAt - a.lastAt).slice(0, 8).forEach(v => {
    const li = document.createElement('li'); li.textContent = v.title + ' · ' + v.count + ' 次打开'; $('#profile-history').append(li);
  });
}
$('#open-profile').addEventListener('click', () => { renderLivingProfile(); showScreen('profile-review'); });
['#begin-check', '#resume-learning'].forEach(selector => $(selector).addEventListener('click', () => {
  if (personalizedGraph) { setTopic(activeTopic, selectedNode); showScreen('learning'); }
  else generateNetwork(description);
}));
$('#update-profile').addEventListener('click', () => { $('#self-description').value = description; showScreen('intro'); $('#self-description').focus(); });
$('#self-description').addEventListener('input', saveProgress);
$('#clear-progress').addEventListener('click', () => {
  const message = localText({ zh: '清除当前浏览器中的画像和学习记录？', en: 'Clear your profile and learning history from this browser?' });
  if (window.confirm(translate(message))) {
    try { localStorage.removeItem(progressKey); } catch {} window.location.reload();
  }
});
try {
  const saved = JSON.parse(localStorage.getItem(progressKey) || 'null');
  if (saved && typeof saved.description === 'string' && saved.description.length <= 2000) {
    description = saved.description; $('#self-description').value = typeof saved.draft === 'string' ? saved.draft.slice(0, 2000) : description;
    for (const [key, value] of Object.entries(saved.knowledgeVisits || {}).slice(-400)) {
      if (value && typeof value.title === 'string' && typeof value.topic === 'string' && Number.isInteger(value.depth) && value.depth >= 0 && Number.isFinite(value.count) && Number.isFinite(value.lastAt)) knowledgeVisits[key] = value;
    }
    for (const [key, value] of Object.entries(saved.reflections || {})) if (typeof value === 'string' && value.length <= 1000) reflections[key] = value;
    if (saved.version === 2 && saved.graph) {
      for (const [session, ids] of Object.entries(saved.nodeHistory || {})) if (Array.isArray(ids)) nodeHistory[session] = ids.filter(id => typeof id === 'string');
      for (const [savedRows, target] of [[saved.networkTrail, networkTrail], [saved.networkForward, networkForward]]) for (const previous of Array.isArray(savedRows) ? savedRows : []) {
        try {
          validateGraph(previous.graph, null, 168);
          if (typeof previous.graph.sessionId === 'string' && previous.graph.nodes.some(n => n.id === previous.selectedNode)) target.push({ graph: previous.graph, selectedNode: previous.selectedNode, activeMode: ['deeper', 'explore', 'why', 'soWhat'].includes(previous.activeMode) ? previous.activeMode : 'deeper' });
        } catch { /* Skip an invalid archived graph without losing the current one. */ }
      }
      registerGraph(validateGraph(saved.graph, null, 168));
      personalizedGraph.sessionId ||= crypto.randomUUID();
      personalizedGraph.nodes.forEach(node => { if (reflections[node.id]) reflections[reflectionKey(node.id)] ||= reflections[node.id]; });
      activeMode = ['deeper', 'explore', 'why', 'soWhat'].includes(saved.activeMode) ? saved.activeMode : 'deeper';
      const node = personalizedGraph.nodes.find(n => n.id === saved.selectedNode) || personalizedGraph.nodes.find(n => n.id === personalizedGraph.next.id);
      setTopic(node.domain, node.id); renderLivingProfile(); showScreen('learning');
    } else if (description) {
      $('#intro-error').textContent = localText({ zh: '你的描述和旧探索记录已保留。点击生成，为你建立真正相关的知识网络。', en: 'Your description and previous history are kept. Generate a network genuinely related to you.' });
    }
  }
} catch { /* Preserve the unreadable snapshot until the next successful save. */ }
