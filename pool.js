let poolFilter = 'all';
let poolRequest = null;
let poolKey = '';
const newsCache = new Map();
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
  const tag = document.createElement('span'); tag.className = 'pool-kind'; tag.textContent = kind === 'news' ? '新闻' : '课题';
  const button = document.createElement('button'); button.className = 'pool-choice'; button.textContent = title + ' →';
  button.addEventListener('click', () => { if (!generating) choose(); });
  const detail = document.createElement('p'); detail.textContent = subtitle;
  row.append(tag, button, detail); return row;
}
function renderPoolItems() {
  if (!personalizedGraph) return;
  const items = $('#pool-items'); items.replaceChildren();
  if (poolFilter !== 'news') poolTopics().forEach(node => {
    items.append(poolItem('topic', node.title.zh, node.exercise.zh, () => generateNetwork(description, node)));
  });
  const state = newsCache.get(poolQuery());
  if (poolFilter !== 'topic') {
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
  status.classList.toggle('pool-loading', poolFilter !== 'topic' && !state);
  status.setAttribute('aria-busy', String(poolFilter !== 'topic' && !state));
  if (poolFilter !== 'topic' && state?.error) status.textContent = localText({ zh: '新闻暂不可用。你仍可以选择课题继续探索。', en: 'News is unavailable. You can still explore a topic.' });
  else if (poolFilter !== 'topic' && state && !state.articles.length) status.textContent = localText({ zh: '暂时没有找到相关新闻。', en: 'No related news was found.' });
  $('#retry-news').hidden = poolFilter === 'topic' || !state?.error;
  $$('[data-pool-filter]').forEach(button => { const selected = button.dataset.poolFilter === poolFilter; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
}
async function renderPool() {
  if (!personalizedGraph) return;
  const query = poolQuery(), key = personalizedGraph.sessionId + ':' + selectedNode;
  renderPoolItems();
  if (poolFilter === 'topic' || newsCache.has(query) || poolKey === key && poolRequest) return;
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
