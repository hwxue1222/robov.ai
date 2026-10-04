const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const topics = Object.create(null);
let activeTopic = '', activeMode = 'deeper', description = '';
const levels = {}, reflections = {};
let personalizedGraph = null;
function showScreen(id) {
  ['intro', 'profile-review', 'results', 'learning'].forEach(name => $('#' + name).hidden = name !== id);
  $$('.journey-progress li').forEach((li, i) => i === (id === 'learning' ? 1 : 0) ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current'));
  window.scrollTo({ top: 0, behavior: 'instant' });
  $('#' + id + ' h1')?.focus({ preventScroll: true });
  if (id === 'learning') { requestAnimationFrame(drawEdges); recordKnowledge(selectedNode); }
  if (description) saveProgress();
}
function setTopic(id, nodeId) {
  if (!topics[id]) return;
  activeTopic = id;
  selectNode(nodeId || getNetwork().find(n => n.parent !== null)?.id || id);
  renderNetwork();
}
function setMode(mode) {
  activeMode = mode;
  const node = getNetwork().find(n => n.id === selectedNode);
  if (!node) return;
  const links = (personalizedGraph?.edges || []).filter(e => e.from === node.id || e.to === node.id);
  const content = {
    deeper: [node.title, node.body, '你的知识边界', node.boundary],
    explore: ['两个方向如何连接', ...links.map(e => e.reason.zh)],
    why: ['为什么现在值得学', node.why],
    soWhat: ['现在就做一个小练习', node.exercise]
  }[mode];
  if (mode === 'explore' && !links.length) content.push('这个点还没有跨领域关联。选择延伸，生成新的连接方向。');
  $('#mode-output').replaceChildren();
  content.forEach((text, i) => { const el = document.createElement(i === 0 ? 'h4' : 'p'); el.textContent = text; $('#mode-output').append(el); });
  $$('.mode-tab').forEach(tab => {
    const selected = tab.dataset.mode === mode;
    tab.setAttribute('aria-selected', String(selected)); tab.classList.toggle('active', selected);
    tab.id = 'tab-' + tab.dataset.mode; tab.setAttribute('aria-controls', 'mode-output'); tab.tabIndex = selected ? 0 : -1;
  });
  $('#mode-output').setAttribute('aria-labelledby', 'tab-' + mode);
}
$('#intro-form').addEventListener('submit', event => { event.preventDefault(); generateNetwork($('#self-description').value.trim()); });
$$('.journey-screen h1').forEach(h => h.tabIndex = -1);
$('#edit-description').addEventListener('click', () => showScreen('intro'));
$('#extend-node').addEventListener('click', () => extendNode());
window.addEventListener('resize', drawEdges);
$('#start-learning').addEventListener('click', () => { setTopic(activeTopic); showScreen('learning'); });
$('#back-map').addEventListener('click', () => { renderLivingProfile(); showScreen('profile-review'); });
$$('.mode-tab').forEach(tab => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
  tab.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
    const tabs = $$('.mode-tab'), i = (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    event.preventDefault(); tabs[i].focus(); setMode(tabs[i].dataset.mode);
  });
});
$('#reflection').addEventListener('input', () => { reflections[selectedNode] = $('#reflection').value; saveProgress(); });
$('#widen').addEventListener('click', () => extendNode('explore'));
$('#complete-learning').addEventListener('click', async () => { reflections[selectedNode] = $('#reflection').value; saveProgress(); await extendNode(); });
