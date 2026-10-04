let poolFilter = 'all';
let poolRequest = null;
let poolKey = '';
const newsCache = new Map();
const researchCache = new Map();
const ideaErrors = new Set();
let ideaRequest = null;
let ideaKey = '';
const poolLabels = { topic: '课题', news: '新闻', person: '人物', event: '重大事件', timeline: '时间线', research: '文献' };
const channelLabels = { science: '科学研究', history: '历史', culture: '社会文化', practice: '实践' };
function currentPoolKey() { return personalizedGraph.sessionId + ':' + selectedNode; }
function poolResearchQuery() {
  const node = personalizedGraph.nodes.find(n => n.id === selectedNode);
  return (node.title.en + ' ' + personalizedGraph.profile.goal.en).slice(0, 180);
}
function poolQuery() {
  const node = personalizedGraph.nodes.find(n => n.id === selectedNode);
  const domain = personalizedGraph.domains.find(d => d.id === node.domain);
  const query = typeof node.newsQuery === 'string' ? node.newsQuery : domain.title.en.split(/[&:|]/)[0];
  return query.slice(0, 80).trim();
}
function poolTopics() {
  const current = personalizedGraph.nodes.find(n => n.id === selectedNode);
  const edges = personalizedGraph.edges.filter(e => e.from === selectedNode || e.to === selectedNode);
  const relatedIds = new Set(edges.map(e => e.from === selectedNode ? e.to : e.from));
  const children = personalizedGraph.nodes.filter(n => n.parent === selectedNode);
  const related = personalizedGraph.nodes.filter(n => relatedIds.has(n.id));
  const candidates = [current, ...children, ...related];
  return [...new Map(candidates.map(n => [n.id, n])).values()].slice(0, 6);
}
function poolItem(kind, title, subtitle, choose) {
  const row = document.createElement('article'); row.className = 'pool-item'; row.dataset.kind = kind;
  const tag = document.createElement('span'); tag.className = 'pool-kind'; tag.textContent = poolLabels[kind];
  const button = document.createElement('button'); button.className = 'pool-choice'; button.textContent = title + ' →';
  button.addEventListener('click', () => { if (!generating) choose(); });
  const detail = document.createElement('p'); detail.textContent = subtitle;
  row.append(tag, button, detail); return row;
}
function renderPoolItems() {
  if (!personalizedGraph) return;
  const items = $('#pool-items'); items.replaceChildren();
  if (['all', 'topic'].includes(poolFilter)) poolTopics().forEach(node => {
    items.append(poolItem('topic', node.title.zh, node.why.zh, () => generateNetwork(description, node)));
  });
  const node = personalizedGraph.nodes.find(n => n.id === selectedNode);
  const entries = personalizedGraph.pools?.[selectedNode];
  (entries || []).filter(entry => poolFilter === 'all' || poolFilter === entry.kind).forEach((entry, index) => {
    const title = localText(entry.title), body = localText(entry.body);
    const row = poolItem(entry.kind, title, body, () => generateNetwork(description, { id: 'pool-' + index, kind: entry.kind, domain: node.domain, title: entry.title, body: entry.body }));
    const channel = document.createElement('span'); channel.className = 'pool-channel';
    channel.textContent = 'AI 知识线索 · ' + channelLabels[entry.channel];
    localText({ zh: channel.textContent, en: 'AI knowledge lead · ' + ({ science: 'Science', history: 'History', culture: 'Society & culture', practice: 'Practice' })[entry.channel] });
    row.append(channel);
    if (entry.sourceUrl) {
      const link = document.createElement('a'); link.href = entry.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'pool-source'; link.textContent = '百科 ↗'; link.title = entry.sourceTitle; row.append(link);
    }
    items.append(row);
  });
  const research = researchCache.get(poolResearchQuery());
  if (['all', 'research'].includes(poolFilter)) (research?.articles || []).forEach((article, index) => {
    const row = poolItem('research', article.title, article.source + (article.year ? ' · ' + article.year : ''), () => {
      const title = { zh: article.title, en: article.title };
      const body = { zh: '文献标题：' + article.title + '。出版社：' + article.source + '。只获取了书目信息，未读取全文。', en: 'Research title: ' + article.title + '. Publisher: ' + article.source + '. Bibliographic metadata only; the full text has not been read.' };
      generateNetwork(description, { id: 'research-' + index, kind: 'research', domain: node.domain, title, body });
    });
    const link = document.createElement('a'); link.href = article.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'pool-source'; link.textContent = '原文 ↗'; row.append(link); items.append(row);
  });
  const state = newsCache.get(poolQuery());
  if (['all', 'news'].includes(poolFilter)) {
    (state?.articles || []).forEach((article, i) => {
      const date = article.indexedAt.match(/^(\d{4})(\d{2})(\d{2})/);
      const when = date ? date[1] + '-' + date[2] + '-' + date[3] : '';
      const subtitle = article.source + (when ? ' · ' + localText({ zh: '收录于 ' + when, en: 'Indexed ' + when }) : '');
      const row = poolItem('news', article.title, subtitle, () => {
        const title = { zh: article.title, en: article.title };
        const body = { zh: '新闻标题：' + article.title + '。来源：' + article.source + '。仅有标题与来源，未读取报道全文。', en: 'Headline: ' + article.title + '. Source: ' + article.source + '. Only the headline and source are available, not the full report.' };
        generateNetwork(description, { id: 'news-' + i, kind: 'news', domain: activeTopic, title, body, url: article.url });
      });
      const source = document.createElement('a'); source.href = article.url; source.target = '_blank'; source.rel = 'noopener noreferrer'; source.className = 'pool-source'; source.textContent = '原文 ↗'; row.append(source);
      items.append(row);
    });
  }
  const status = $('#pool-status'); status.textContent = '';
  const showNews = ['all', 'news'].includes(poolFilter);
  status.classList.toggle('pool-loading', showNews && !state);
  status.setAttribute('aria-busy', String(showNews && !state));
  if (showNews && state?.error) status.textContent = localText({ zh: '新闻暂不可用。你仍可以选择其他线索继续探索。', en: 'News is unavailable. Other leads remain available.' });
  else if (showNews && state && !state.articles.length) status.textContent = localText({ zh: '暂时没有找到相关新闻。', en: 'No related news was found.' });
  $('#retry-news').hidden = !showNews || !state?.error;
  const showIdeas = !['news', 'research'].includes(poolFilter), failed = ideaErrors.has(currentPoolKey());
  const ideaStatus = $('#pool-ideas-status'); ideaStatus.textContent = '';
  ideaStatus.classList.toggle('pool-loading', showIdeas && !entries && !failed);
  ideaStatus.setAttribute('aria-busy', String(showIdeas && !entries && !failed));
  if (showIdeas && failed) ideaStatus.textContent = localText({ zh: '更多知识线索暂不可用。', en: 'Additional knowledge leads are unavailable.' });
  else if (showIdeas && entries && poolFilter !== 'all' && poolFilter !== 'topic' && !entries.some(e => e.kind === poolFilter)) ideaStatus.textContent = localText({ zh: '当前知识点没有此类线索。', en: 'No leads of this type for the current idea.' });
  $('#retry-ideas').hidden = !showIdeas || !failed;
  const showResearch = ['all', 'research'].includes(poolFilter), researchStatus = $('#pool-research-status'); researchStatus.textContent = '';
  researchStatus.classList.toggle('pool-loading', showResearch && (!research || research.pending));
  researchStatus.setAttribute('aria-busy', String(showResearch && (!research || research.pending)));
  if (showResearch && research?.error) researchStatus.textContent = localText({ zh: '文献渠道暂不可用。', en: 'Research sources are unavailable.' });
  else if (showResearch && research && !research.pending && !research.articles.length) researchStatus.textContent = localText({ zh: '没有找到相关文献。', en: 'No related research was found.' });
  $('#retry-research').hidden = !showResearch || !research?.error;
  $$('[data-pool-filter]').forEach(button => { const selected = button.dataset.poolFilter === poolFilter; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
}
function renderPool() {
  if (!personalizedGraph) return;
  renderPoolItems();
  if (!['news', 'research'].includes(poolFilter)) loadPoolIdeas();
  if (['all', 'news'].includes(poolFilter)) loadPoolNews();
  if (['all', 'research'].includes(poolFilter)) loadPoolResearch();
}
async function loadPoolIdeas() {
  const graph = personalizedGraph, id = selectedNode, key = currentPoolKey();
  if (graph.pools?.[id] || ideaErrors.has(key) || ideaKey === key && ideaRequest) return;
  ideaRequest?.abort(); ideaKey = key;
  const controller = new AbortController(); ideaRequest = controller;
  const timeout = setTimeout(() => controller.abort(), 115000);
  try {
    const response = await fetch('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'pool', description, focus: graph.nodes.find(n => n.id === id) }), signal: controller.signal });
    const result = await response.json();
    if (!response.ok) throw new Error('Pool unavailable');
    const entries = validatePool(result.entries);
    entries.forEach(entry => { localText(entry.title); localText(entry.body); });
    (graph.pools ||= {})[id] = entries; graph.poolVersion = 2; saveProgress();
  } catch (error) {
    if (error.name !== 'AbortError' || ideaKey === key) ideaErrors.add(key);
  } finally {
    clearTimeout(timeout);
    if (ideaRequest === controller) ideaRequest = null;
    if (currentPoolKey() === key) renderPoolItems();
  }
}
async function loadPoolResearch() {
  const query = poolResearchQuery();
  if (researchCache.has(query)) return;
  researchCache.set(query, { pending: true, articles: [] });
  try {
    const response = await fetch('/api/research?q=' + encodeURIComponent(query), { signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.articles)) throw new Error('Research unavailable');
    researchCache.set(query, { articles: result.articles });
  } catch { researchCache.set(query, { articles: [], error: true }); }
  if (poolResearchQuery() === query) renderPoolItems();
}
async function loadPoolNews() {
  if (!personalizedGraph) return;
  const query = poolQuery(), key = personalizedGraph.sessionId + ':' + selectedNode;
  renderPoolItems();
  if (newsCache.has(query) || poolKey === key && poolRequest) return;
  poolRequest?.abort(); poolKey = key;
  const controller = new AbortController(); poolRequest = controller;
  try {
    const response = await fetch('/api/news?q=' + encodeURIComponent(query), { signal: controller.signal });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.articles)) throw new Error('News unavailable');
    newsCache.set(query, { articles: result.articles });
  } catch (error) {
    if (error.name === 'AbortError') return;
    newsCache.set(query, { articles: [], error: true });
  } finally {
    if (poolRequest === controller) poolRequest = null;
    if (personalizedGraph?.sessionId + ':' + selectedNode === key) renderPoolItems();
  }
}
$$('[data-pool-filter]').forEach(button => {
  const select = () => { poolFilter = button.dataset.poolFilter; renderPool(); };
  button.addEventListener('click', select);
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const tabs = $$('[data-pool-filter]'), index = (tabs.indexOf(button) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    event.preventDefault(); tabs[index].focus(); poolFilter = tabs[index].dataset.poolFilter; renderPool();
  });
});
$('#retry-news').addEventListener('click', () => { newsCache.delete(poolQuery()); renderPool(); });
$('#retry-ideas').addEventListener('click', () => { ideaErrors.delete(currentPoolKey()); renderPool(); });
$('#retry-research').addEventListener('click', () => { researchCache.delete(poolResearchQuery()); renderPool(); });
