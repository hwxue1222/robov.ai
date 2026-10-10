(function () {
  const $ = id => document.getElementById(id);
  const make = (tag, text) => { const node = document.createElement(tag); if (text) node.textContent = text; return node; };
  const shared = [['slug', '资料编号'], ['name', '名称'], ['phone', '联系电话'], ['email', '联系邮箱'], ['image', '展示图片链接']];
  const fields = {
    merchant: [...shared, ['nameZh', '中文名称'], ['category', '商家分类'], ['country', '国家'], ['region', '地区'], ['description', '商家介绍'], ['website', '官方网站'], ['logo', 'Logo 图片链接'], ['sourceUrl', '资料来源链接']],
    store: [...shared, ['merchantId', '所属商家'], ['outletName', '门店展示名称'], ['city', '城市'], ['address', '门店地址'], ['hours', '营业时间'], ['reviewUrl', 'Google Review 链接'], ['active', '启用门店']]
  };
  let merchants = [], editing = null, kind = 'store', view = 'store', busy = false, snapshot = null;
  const pager = window.RobovPager([$('store-profile-pagination')], page => load(page));
  function close() {
    editing = null; $('store-profile-editor').hidden = true;
    $('store-merchant-view').hidden = view !== 'merchant'; $('store-outlet-view').hidden = view !== 'store';
  }
  function edit(type, row) {
    if (busy) return;
    kind = type; editing = row || null; $('store-profile-title').textContent = kind === 'merchant' ? '商家资料' : '门店资料';
    $('store-profile-fields').replaceChildren();
    for (const [key, label] of fields[kind]) {
      const container = make('div'), caption = make('label', label), id = 'store-profile-' + key;
      caption.htmlFor = id;
      const input = make(key === 'merchantId' ? 'select' : ['description', 'address', 'hours'].includes(key) ? 'textarea' : 'input');
      input.id = id; input.name = key;
      if (key === 'merchantId') input.replaceChildren(new Option('未关联商家', ''), ...merchants.map(merchant => new Option(merchant.name, merchant.id)));
      else if (key === 'active') input.type = 'checkbox';
      else if (key === 'email') input.type = 'email';
      else if (input.tagName === 'INPUT') input.type = 'text';
      input.maxLength = ['description', 'address', 'website', 'logo', 'image', 'sourceUrl', 'reviewUrl'].includes(key) ? 2000 : key === 'hours' ? 500 : key === 'slug' ? 100 : key === 'name' ? 150 : 254;
      if (key === 'slug') { input.pattern = '[a-z0-9]+(-[a-z0-9]+)*'; input.readOnly = !!row; input.spellcheck = false; }
      input.required = ['name', 'slug'].includes(key);
      input.value = row ? row[key] ?? '' : (key === 'merchantId' ? merchants[0]?.id || '' : '');
      if (key === 'active') { input.checked = row?.active ?? true; caption.prepend(input); container.append(caption); }
      else { container.append(caption, input); }
      if (['description', 'address', 'hours'].includes(key)) container.className = 'store-field-wide';
      if (['logo', 'image'].includes(key) && row?.[key]) { const image = make('img'); image.src = row[key]; image.alt = row.name; image.className = 'store-profile-preview'; container.append(image); }
      $('store-profile-fields').append(container);
    }
    $('store-outlet-view').hidden = true; $('store-merchant-view').hidden = true;
    $('store-profile-editor').hidden = false; $('store-profile-name').focus();
  }
  function rowView(row, type) {
    const article = make('article'); article.className = 'campaign-row';
    const identity = make('div'); identity.dataset.noTranslate = ''; identity.append(make('strong', row.name), make('p', row.slug));
    if (type === 'store') identity.append(make('p', [row.merchant?.name, row.address].filter(Boolean).join(' / ')));
    const actions = make('div'); actions.className = 'camera-tools';
    if (type === 'store') actions.append(make('span', row.active ? '已启用' : '已停用'));
    const button = make('button', '编辑'); button.type = 'button'; button.className = 'secondary-button'; button.addEventListener('click', () => edit(type, row)); actions.append(button);
    article.append(identity, actions); return article;
  }
  async function load(page = 1) {
    if (busy) return; busy = true; pager.busy(true);
    try {
      const params = new URLSearchParams({ page }); if (snapshot) params.set('asOf', snapshot);
      const response = await fetch('/api/robov/stores?' + params), result = await response.json();
      if (!response.ok) { if ([401, 403].includes(response.status)) { $('store-management').hidden = true; return; } throw Error(result.error); }
      $('store-management').hidden = false; merchants = result.merchants; snapshot = result.pagination.asOf;
      $('store-profile-rows').replaceChildren(...result.rows.map(row => rowView(row, 'store')));
      $('merchant-profile-rows').replaceChildren(...merchants.map(row => rowView(row, 'merchant')));
      pager.update(result.pagination); $('store-management-status').textContent = '';
    } catch (error) { $('store-management-status').textContent = error.message; }
    finally { busy = false; pager.busy(false); }
  }
  async function refreshStores() {
    const response = await fetch('/api/robov/session'), result = await response.json();
    if (!response.ok || !result.user) throw Error('STORES_UNAVAILABLE');
    const select = $('staff-store'), previous = select.value, stores = result.user.stores;
    select.replaceChildren(...stores.map(store => new Option(store.name, store.id)));
    select.value = stores.some(store => store.id === previous) ? previous : stores[0]?.id || '';
    $('profile-stores').replaceChildren(...stores.map(store => make('li', store.name)));
    if (select.value !== previous) select.dispatchEvent(new Event('change'));
    window.dispatchEvent(new CustomEvent('robov-stores-changed', { detail: { stores } }));
  }
  document.querySelectorAll('[data-store-view]').forEach(button => button.addEventListener('click', () => {
    if (busy) return; view = button.dataset.storeView; close();
    const merchant = button.dataset.storeView === 'merchant';
    $('store-merchant-view').hidden = !merchant; $('store-outlet-view').hidden = merchant;
    document.querySelectorAll('[data-store-view]').forEach(item => item.setAttribute('aria-selected', String(item === button)));
  }));
  $('new-store-profile').addEventListener('click', () => edit('store'));
  $('new-merchant-profile').addEventListener('click', () => edit('merchant'));
  $('cancel-store-profile').addEventListener('click', close);
  $('store-profile-editor').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return; busy = true;
    const controls = Array.from($('store-profile-editor').querySelectorAll('input,select,textarea,button'));
    try {
      const input = { kind, ...(editing ? { id: editing.id, version: editing.version } : {}) };
      for (const [key] of fields[kind]) input[key] = key === 'active' ? $('store-profile-active').checked : $('store-profile-' + key).value.trim();
      controls.forEach(control => { control.disabled = true; });
      const response = await fetch('/api/robov/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }), result = await response.json();
      if (!response.ok) throw Error(result.error);
      close(); snapshot = null; busy = false; await load(); await refreshStores(); $('store-management-status').textContent = '资料已保存';
    } catch (error) { $('store-management-status').textContent = error.message; }
    finally { busy = false; controls.forEach(control => { control.disabled = false; }); }
  });
  load();
})();
