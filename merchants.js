(async () => {
  const make = (tag, className, text) => { const node = document.createElement(tag); node.className = className; if (text) node.textContent = text; return node; };
  const picture = (src, alt, className = '') => { const node = make('img', className); node.src = src; node.alt = alt; node.loading = 'lazy'; return node; };
  const external = (href, text) => { const node = make('a', '', text); const url = new URL(href); if (url.protocol !== 'https:') throw new Error('INVALID_URL'); node.href = url.href; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node; };
  const status = document.querySelector('#merchant-status');
  try {
    const response = await fetch('/api/robov/merchants');
    if (!response.ok) throw new Error('UNAVAILABLE');
    const { merchants } = await response.json();
    const id = new URLSearchParams(location.search).get('id');
    if (id) {
      document.querySelector('#merchant-directory').hidden = true;
      document.querySelector('#merchant-profile').hidden = false;
      const merchant = merchants.find(item => item.id === id);
      if (!merchant) { status.textContent = '未找到该商家'; return; }
      document.title = `${merchant.name} | ROBOV Merchant`;
      const heading = make('div', 'merchant-profile-heading');
      if (merchant.logo) heading.append(picture(merchant.logo, merchant.name, 'merchant-logo'));
      heading.append(make('p', 'eyebrow', `${merchant.region} / ${merchant.country}`), make('h1', '', merchant.name), make('p', '', merchant.nameZh), make('p', '', merchant.description));
      const links = make('div', 'merchant-profile-links');
      const staff = make('a', '', '店员工作台 ↗'); staff.href = './staff.html';
      const rewards = make('a', '', 'Google Review ↗'); rewards.href = './rewards.html';
      if (merchant.website) links.append(external(merchant.website, '官方网站 ↗'));
      links.append(rewards, staff);
      heading.append(links, make('p', '', `${merchant.phone} · ${merchant.email}`));
      const source = make('p', 'merchant-source'); if (merchant.sourceUrl) source.append(external(merchant.sourceUrl, merchant.id === 'jwd-mee-tarik' ? '资料来源：JWD 官方网站' : '资料来源链接'));
      heading.append(source);
      document.querySelector('#merchant-heading').append(heading);
      for (const outlet of merchant.outlets) {
        const article = make('article', 'merchant-outlet'); const details = make('div', '');
        details.append(make('p', 'eyebrow', outlet.city), make('h2', '', outlet.name), make('p', '', outlet.address), make('p', '', outlet.hours));
        if (outlet.reviewUrl) details.append(external(outlet.reviewUrl, 'Google Maps / Review ↗'));
        if (outlet.image) article.append(picture(outlet.image, `${merchant.name} ${outlet.name}`));
        article.append(details);
        document.querySelector('#merchant-outlets').append(article);
      }
    } else {
      const render = () => {
        const search = document.querySelector('#merchant-search').value.trim().toLowerCase();
        const matches = merchants.filter(item => `${item.name} ${item.nameZh} ${item.region} ${item.outlets.map(outlet => `${outlet.name} ${outlet.city}`).join(' ')}`.toLowerCase().includes(search));
        const list = document.querySelector('#merchant-list'); list.replaceChildren();
        for (const merchant of matches) {
          const link = make('a', 'merchant-item'); link.href = `./merchants.html?id=${encodeURIComponent(merchant.id)}`;
          const copy = make('div', 'merchant-item-copy');
          copy.append(make('p', 'eyebrow', merchant.category), make('h2', '', merchant.name), make('p', '', `${merchant.nameZh} · ${merchant.outlets.length} 家门店`), make('p', '', `${merchant.region}, ${merchant.country}`));
          if (merchant.image) link.append(picture(merchant.image, merchant.name));
          link.append(copy); list.append(link);
        }
        document.querySelector('#merchant-count').textContent = `${matches.length} 个商家`;
        status.textContent = matches.length ? '' : '没有匹配的商家';
      };
      document.querySelector('#merchant-search').addEventListener('input', render);
      render(); return;
    }
    status.textContent = '';
  } catch { status.textContent = '暂时无法加载，请稍后重试。'; }
})();
