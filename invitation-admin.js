(function () {
  const $ = id => document.getElementById(id);
  const make = (tag, text) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
  let scope = '', snapshot = null, rows = [], stores = [], editing = null, busy = false, generation = 0;
  let selectedCode = null, memberSnapshot = null, memberGeneration = 0;
  const pager = new window.RobovPager([$('invitation-pagination-top'), $('invitation-pagination-bottom')], page => load(page));
  const memberPager = new window.RobovPager([$('invitation-member-pagination-top'), $('invitation-member-pagination-bottom')], page => members(page));
  function status(message) { $('invitation-status').textContent = message; }
  function options(select, all) {
    select.replaceChildren(...(all ? [new Option('全部门店', '')] : []), ...stores.map(store => new Option(store.name, store.id)));
  }
  function closeEditor() { editing = null; $('invitation-editor').hidden = true; }
  function edit(row) {
    if (busy) return;
    editing = row || null; $('invitation-editor').hidden = false;
    options($('invitation-owner'), false);
    $('invitation-owner').value = row?.storeId || scope || $('staff-store').value || stores[0]?.id;
    $('invitation-owner').disabled = !!row;
    $('invitation-code').value = row?.code || '';
    $('invitation-name').value = row?.name || '';
    $('invitation-rate').value = (row?.rateBps ?? 500) / 100;
    $('invitation-enabled').checked = row?.enabled ?? true;
    $('invitation-reward-enabled').checked = row?.rewardEnabled ?? true;
    $('invitation-editor').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); $('invitation-code').focus();
  }
  function render() {
    $('invitation-rows').replaceChildren(...rows.map(row => {
      const article = make('article'); article.className = 'campaign-row invitation-row'; article.dataset.invitationId = row.id;
      const info = make('div'), code = make('strong', row.code), name = make('p', row.name); code.dataset.noTranslate = ''; name.dataset.noTranslate = ''; info.append(code, name, make('p', row.store.name));
      const terms = make('p'); terms.append(make('span', row.enabled ? '允许新会员使用' : '已暂停新注册'), ' / ', make('span', row.rewardEnabled ? '邀请码奖励' : '邀请码奖励已停用'), ` ${row.rateBps / 100}%`); info.append(terms);
      const actions = make('div'); actions.className = 'camera-tools';
      const stats = make('button'); stats.type = 'button'; stats.className = 'secondary-button'; stats.append(make('span', '查看注册会员'), ` · ${row._count.members}`); stats.addEventListener('click', () => { selectedCode = row; memberSnapshot = null; members(1); });
      const change = make('button', '编辑'); change.type = 'button'; change.className = 'secondary-button'; change.addEventListener('click', () => edit(row)); actions.append(stats, change); article.append(info, actions); return article;
    }));
  }
  async function load(page = 1) {
    if (busy) return;
    busy = true; pager.busy(true); $('new-invitation').disabled = true; $('invitation-store').disabled = true;
    const attempt = ++generation;
    try {
      const params = new URLSearchParams({ page, storeId: scope }); if (snapshot) params.set('asOf', snapshot);
      const response = await fetch('/api/robov/invitations?' + params);
      const result = await response.json(); if (attempt !== generation) return;
      if (!response.ok) { if ([401, 403].includes(response.status)) $('invitation-management').hidden = true; throw new Error(result.error); }
      $('invitation-management').hidden = false; rows = result.rows; stores = result.stores; snapshot = result.pagination.asOf;
      options($('invitation-store'), true); $('invitation-store').value = scope; pager.update(result.pagination); render();
      const summary = $('invitation-summary'); summary.replaceChildren();
      for (const [label, count] of [['邀请码数量', result.pagination.total], ['注册人数', result.summary.registrations], ['近7天注册', result.summary.last7Days]]) { const item = make('div'); item.append(make('span', label), make('strong', String(count))); summary.append(item); }
      status(rows.length ? '' : '暂无邀请码');
    } catch (error) { status(error.message || 'INVITATIONS_UNAVAILABLE'); }
    finally { busy = false; pager.busy(false); $('new-invitation').disabled = false; $('invitation-store').disabled = false; }
  }
  async function members(page = 1) {
    if (!selectedCode) return;
    const code = selectedCode, attempt = ++memberGeneration; memberPager.busy(true); $('invitation-members').hidden = false; $('invitation-member-code').textContent = code.code;
    try {
      const params = new URLSearchParams({ id: code.id, page }); if (memberSnapshot) params.set('asOf', memberSnapshot);
      const response = await fetch('/api/robov/invitations?' + params); const result = await response.json();
      if (attempt !== memberGeneration) return; if (!response.ok) throw new Error(result.error);
      memberSnapshot = result.pagination.asOf; memberPager.update(result.pagination);
      $('invitation-member-rows').replaceChildren(...result.rows.map(row => { const item = make('article'); item.className = 'campaign-row'; const identity = make('div'); identity.dataset.noTranslate = ''; identity.append(make('strong', row.displayName || row.email), make('p', row.email || '')); const date = make('time', new Date(row.createdAt).toLocaleString()); date.dateTime = row.createdAt; item.append(identity, date); return item; }));
      if (!result.rows.length) $('invitation-member-rows').append(make('p', '暂无注册会员'));
    } catch (error) { status(error.message || 'INVITATIONS_UNAVAILABLE'); }
    finally { if (attempt === memberGeneration) memberPager.busy(false); }
  }
  function filter(value) { if (busy) return; scope = value; snapshot = null; closeEditor(); selectedCode = null; memberGeneration++; $('invitation-members').hidden = true; load(); }
  $('invitation-store').addEventListener('change', () => filter($('invitation-store').value));
  $('staff-store').addEventListener('change', () => filter($('staff-store').value));
  $('new-invitation').addEventListener('click', () => edit(null)); $('cancel-invitation').addEventListener('click', closeEditor);
  $('invitation-editor').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return; busy = true; const button = event.submitter; button.disabled = true;
    for (const input of $('invitation-editor').querySelectorAll('input,select,button')) input.disabled = true;
    $('new-invitation').disabled = true; $('invitation-store').disabled = true;
    try {
      const number = Number($('invitation-rate').value) * 100;
      if (!Number.isFinite(number) || Math.abs(number - Math.round(number)) > 0.00001) throw new Error('INVALID_INVITATION_SETTINGS');
      const input = { storeId: $('invitation-owner').value, code: $('invitation-code').value, name: $('invitation-name').value, rateBps: Math.round(number), enabled: $('invitation-enabled').checked, rewardEnabled: $('invitation-reward-enabled').checked, ...(editing ? { id: editing.id, version: editing.version } : {}) };
      const response = await fetch('/api/robov/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); const result = await response.json(); if (!response.ok) throw new Error(result.error);
      closeEditor(); selectedCode = null; memberGeneration++; $('invitation-members').hidden = true; snapshot = null; busy = false; await load(); status('邀请码已保存，仅影响后续注册和消费');
    } catch (error) { status(error.message || 'INVITATIONS_UNAVAILABLE'); }
    finally { busy = false; for (const input of $('invitation-editor').querySelectorAll('input,select,button')) input.disabled = false; $('invitation-owner').disabled = !!editing; $('new-invitation').disabled = false; $('invitation-store').disabled = false; }
  });
  new MutationObserver(() => { if ($('staff-store').value && !stores.length) { scope = $('staff-store').value; load(); } }).observe($('staff-store'), { childList: true });
})();
