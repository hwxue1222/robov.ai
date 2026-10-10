(function () {
  const $ = id => document.getElementById(id);
  let stores = [], editing = null, busy = false, snapshot = null;
  const pager = new window.RobovPager([$('staff-account-pagination')], page => load(page));
  const make = (tag, text) => { const el = document.createElement(tag); el.textContent = text; return el; };
  function edit(row) {
    if (busy) return; editing = row || null; $('staff-account-editor').hidden = false;
    $('staff-account-name').value = row?.displayName || ''; $('staff-account-email').value = row?.email || ''; $('staff-account-email').readOnly = !!row;
    $('staff-account-password').value = ''; $('staff-account-password-field').hidden = !!row; $('staff-account-password').required = !row;
    $('staff-account-store').replaceChildren(...stores.map(store => new Option(store.name, store.id))); $('staff-account-store').value = row?.staffStoreId || $('staff-store').value || stores[0]?.id;
    $('staff-account-active').checked = row?.active ?? true; $('staff-account-name').focus();
  }
  function close() { editing = null; $('staff-account-password').value = ''; $('staff-account-editor').hidden = true; }
  async function load(page = 1) {
    if (busy) return; busy = true; pager.busy(true); $('new-staff-account').disabled = true;
    try {
      const params = new URLSearchParams({ page }); if (snapshot) params.set('asOf', snapshot);
      const response = await fetch('/api/robov/staff-accounts?' + params), result = await response.json();
      if (!response.ok) { if ([401, 403].includes(response.status)) $('staff-account-management').hidden = true; throw new Error(result.error); }
      $('staff-account-management').hidden = false; stores = result.stores; snapshot = result.pagination.asOf; pager.update(result.pagination);
      $('staff-account-rows').replaceChildren(...result.rows.map(row => {
        const article = document.createElement('article'); article.className = 'campaign-row'; article.dataset.staffId = row.id;
        const identity = document.createElement('div'); identity.dataset.noTranslate = ''; identity.append(make('strong', row.displayName || row.email), make('p', row.email || ''), make('p', row.staffStore?.name || ''));
        const actions = document.createElement('div'); actions.className = 'camera-tools'; actions.append(make('span', row.active ? '已启用' : '已停用'));
        const button = make('button', '编辑'); button.type = 'button'; button.className = 'secondary-button'; button.addEventListener('click', () => edit(row)); actions.append(button); article.append(identity, actions); return article;
      }));
      $('staff-account-status').textContent = result.rows.length ? '' : '暂无Staff账号';
    } catch (error) { $('staff-account-status').textContent = error.message; }
    finally { busy = false; pager.busy(false); $('new-staff-account').disabled = false; }
  }
  $('new-staff-account').addEventListener('click', () => edit(null)); $('cancel-staff-account').addEventListener('click', close);
  $('staff-account-editor').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return; busy = true;
    for (const input of $('staff-account-editor').querySelectorAll('input,select,button')) input.disabled = true;
    try {
      const data = { storeId: $('staff-account-store').value, displayName: $('staff-account-name').value.trim(), active: $('staff-account-active').checked, ...(editing ? { id: editing.id } : { email: $('staff-account-email').value.trim(), password: $('staff-account-password').value }) };
      const response = await fetch('/api/robov/staff-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }), result = await response.json();
      if (!response.ok) throw new Error(result.error); close(); snapshot = null; busy = false; await load(); $('staff-account-status').textContent = '账号已保存，员工需重新登录';
    } catch (error) { $('staff-account-status').textContent = error.message; }
    finally { busy = false; for (const input of $('staff-account-editor').querySelectorAll('input,select,button')) input.disabled = false; }
  });
  new MutationObserver(() => { if ($('staff-store').value && !stores.length) load(); }).observe($('staff-store'), { childList: true });
})();
