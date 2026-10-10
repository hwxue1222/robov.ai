const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const topics = Object.create(null);
let activeTopic = '', activeMode = 'deeper', description = '';
const levels = {}, reflections = {};
let personalizedGraph = null;
function reflectionKey(id) { return personalizedGraph.sessionId + ':' + id; }
function showScreen(id) {
  $('#home').hidden = id !== 'intro';
  ['intro', 'profile-review', 'results', 'learning'].forEach(name => $('#' + name).hidden = name !== id);
  $$('.journey-progress li').forEach((li, i) => i === (id === 'learning' ? 1 : 0) ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current'));
  window.scrollTo({ top: 0, behavior: 'instant' });
  $('#' + id + (id === 'learning' ? ' #node-detail h2' : ' h1'))?.focus({ preventScroll: true });
  if (id === 'learning') { requestAnimationFrame(drawEdges); recordKnowledge(selectedNode); }
  if (description) saveProgress();
}
function setTopic(id, nodeId) {
  if (!topics[id]) return;
  activeTopic = id;
  selectNode(nodeId || getNetwork().find(n => n.parent !== null)?.id || id);
  renderNetwork();
}
function setMode() {
  activeMode = 'deeper';
  const node = getNetwork().find(n => n.id === selectedNode);
  if (!node) return;
  const content = ['核心原理', node.body, '适用边界', node.boundary];
  $('#mode-output').replaceChildren();
  content.forEach((text, i) => { const el = document.createElement(i === 0 ? 'h4' : 'p'); el.textContent = text; $('#mode-output').append(el); });
}
$('#intro-form').addEventListener('submit', event => { event.preventDefault(); generateNetwork($('#self-description').value.trim()); });
$$('a[href="#intro"]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  if ($('#intro').hidden) showScreen('intro');
  $('#intro').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  $('#self-description').focus({ preventScroll: true });
}));
$$('.journey-screen h1').forEach(h => h.tabIndex = -1);
$('#edit-description').addEventListener('click', () => showScreen('intro'));
$('#extend-node').addEventListener('click', () => extendNode());
$('#widen-node').addEventListener('click', () => extendNode('explore'));
$('#recenter-node').addEventListener('click', () => {
  const focus = personalizedGraph?.nodes.find(n => n.id === selectedNode);
  if (focus) generateNetwork(description, focus);
});
$('#return-network').addEventListener('click', () => returnToNetwork());
$('#forward-network').addEventListener('click', () => forwardToNetwork());
$('#back-node').addEventListener('click', backToNode);
window.addEventListener('resize', drawEdges);
$('#start-learning').addEventListener('click', () => { setTopic(activeTopic); showScreen('learning'); });
$('#back-map').addEventListener('click', () => { renderLivingProfile(); showScreen('profile-review'); });
$('#reflection').addEventListener('input', () => { reflections[reflectionKey(selectedNode)] = $('#reflection').value; saveProgress(); });
$('#complete-learning').addEventListener('click', () => { reflections[reflectionKey(selectedNode)] = $('#reflection').value; saveProgress(); $('#learning-feedback').textContent = localText({ zh: '已保存', en: 'Saved' }); });
