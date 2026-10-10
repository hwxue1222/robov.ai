(async () => {
  const status = document.querySelector('#review-status');
  const container = document.querySelector('#review-tasks');
  const make = (tag, className, text) => { const el = document.createElement(tag); el.className = className; if (text) el.textContent = text; return el; };
  try {
    const response = await fetch('/api/robov/rewards');
    if (!response.ok) throw new Error('UNAVAILABLE');
    const { tasks } = await response.json();
    for (const task of tasks) {
      const article = make('article', 'review-task');
      const top = make('div', 'review-task-top');
      top.append(make('span', 'review-google', 'G'), make('span', 'review-label', '自愿参与'));
      article.append(top, make('h2', '', task.storeName), make('p', '', task.businessName), make('p', 'review-address', task.address));
      if (task.available && task.url) {
        const url = new URL(task.url);
        if (url.protocol !== 'https:') throw new Error('INVALID_URL');
        const link = make('a', 'home-primary', '前往 Google 评价 ↗');
        link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', `${task.storeName} Google Review`);
        article.append(link);
      } else article.append(make('p', '', '评价入口暂未开放'));
      container.append(article);
    }
    status.textContent = tasks.length ? '' : '暂无开放任务';
  } catch { container.replaceChildren(); status.textContent = '暂时无法加载，请稍后重试。'; }
})();
