(function () {
  const $ = selector => document.querySelector(selector);
  const state = {
    storeId: localStorage.getItem('robovStoreId') || '',
    memberSessionToken: null,
    busy: false,
    clearPending: false
  };
  function selectionControls() {
    for (const form of ['earn-form', 'redeem-form', 'interaction-form']) {
      $(`#${form} button[type="submit"]`).disabled = state.busy || !state.memberSessionToken;
    }
    $('#exit-member').disabled = state.busy || (!state.memberSessionToken && !state.clearPending);
    $('#refund-form button[type="submit"]').disabled = state.busy;
    $('#staff-store').disabled = state.busy || state.fixedStore;
    for (const id of ['start-camera', 'read-qr-image', 'identify-member', 'scan-token']) {
      $(`#${id}`).disabled = state.busy || state.clearPending || !!state.memberSessionToken;
    }
  }
  async function clearSelection() {
    if (state.busy) return;
    state.memberSessionToken = null;
    state.clearPending = true;
    state.busy = true;
    $('#scan-token').value = '';
    $('#scanned-member').textContent = '';
    for (const id of ['amount', 'receipt-no', 'redeem-amount', 'redeem-receipt', 'transaction-id']) $(`#${id}`).value = '';
    $('#redeem-eligible').checked = false;
    $('#interaction-form input[type="checkbox"]').checked = false;
    $('#earn-preview').textContent = '';
    show('已退出当前会员，请识别下一位会员');
    window.dispatchEvent(new Event('robov-member-cleared'));
    selectionControls();
    try {
      const response = await fetch('/api/robov/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear-member', storeId: state.storeId }) });
      if (!response.ok) throw new Error('会员退出失败，请重试或重新登录');
      state.clearPending = false;
    } catch (error) { show(error.message); }
    finally { state.busy = false; selectionControls(); }
  }
  window.RobovSelectedMember = {
    get busy() { return state.busy || state.clearPending; },
    get active() { return !!state.memberSessionToken; },
    verifying(value) { state.busy = value; selectionControls(); },
    set(token) { state.memberSessionToken = token; selectionControls(); window.dispatchEvent(new Event('robov-member-selected')); },
    async quote(amount) {
      const token = state.memberSessionToken, storeId = state.storeId;
      if (!token) throw new Error('MEMBER_NOT_SELECTED');
      const response = await fetch('/api/robov/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'quote', storeId, memberSessionToken: token, amount }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'POLICY_UNAVAILABLE');
      if (token !== state.memberSessionToken || storeId !== state.storeId) return null;
      return result.reward;
    }
  };
  $('#exit-member').addEventListener('click', clearSelection);

  function idempotencyKey(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  async function staffAction(body, keyPrefix) {
    if (state.busy) throw new Error('操作处理中，请稍候');
    if (body.action !== 'refund' && !state.memberSessionToken) throw new Error('MEMBER_NOT_SELECTED');
    state.busy = true;
    selectionControls();
    try {
      const response = await fetch('/api/robov/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': idempotencyKey(keyPrefix)
        },
        body: JSON.stringify({ ...body, storeId: state.storeId, memberSessionToken: state.memberSessionToken })
      });
      const payload = await response.json();
      if (!response.ok) {
        if (payload.error === 'MEMBER_NOT_SELECTED') { state.memberSessionToken = null; $('#scanned-member').textContent = ''; }
        throw new Error(payload.error || '请求失败');
      }
      return payload;
    } finally { state.busy = false; selectionControls(); }
  }

  function show(message) {
    $('#staff-status').textContent = message;
  }

  $('#staff-store').addEventListener('change', () => {
    state.storeId = $('#staff-store').value;
    localStorage.setItem('robovStoreId', state.storeId);
    clearSelection();
  });

  (async () => {
    const response = await fetch('/api/robov/session');
    const { user } = await response.json();
    if (!response.ok || !user?.isEmployee) { location.replace('./login.html?mode=employee'); return; }
    $('#staff-main').hidden = false;
    const role = document.createElement('span'); role.textContent = user.role === 'SUPERADMIN' ? '超级管理员' : user.role === 'ADMIN' ? '门店管理员' : '员工';
    $('#staff-identity').append(document.createTextNode((user.displayName || user.username || '') + ' · '), role);
    $('#staff-store').replaceChildren(...user.stores.map(store => { const option = document.createElement('option'); option.value = store.id; option.textContent = store.name; return option; }));
    state.storeId = user.stores.some(store => store.id === state.storeId) ? state.storeId : user.stores[0]?.id || '';
    $('#staff-store').value = state.storeId; $('#staff-store').disabled = false;
    state.fixedStore = user.role === 'STAFF';
    selectionControls();
  })().catch(() => location.replace('./login.html?mode=employee'));

  $('#earn-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const result = await staffAction({ action: 'earn', amount: $('#amount').value, receiptNo: $('#receipt-no').value }, 'earn');
      show(`已发放 ${result.transaction.points} RBP，交易 ${result.transaction.id}`);
    } catch (error) {
      show(error.message);
    }
  });

  $('#redeem-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const result = await staffAction({ action: 'redeem',activityId:$('#redeem-activity').value||undefined, points: Number($('#redeem-points').value), amount: $('#redeem-amount').value, receiptNo: $('#redeem-receipt').value, dineIn: $('#redeem-eligible').checked, otherPromotion: !$('#redeem-eligible').checked }, 'redeem');
      show(`已发起兑换 ${Math.abs(result.transaction.points)} RBP，等待会员确认：${result.transaction.id}`);
    } catch (error) {
      show(error.message);
    }
  });

  $('#refund-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const result = await staffAction({ action: 'refund', transactionId: $('#transaction-id').value.trim() }, 'refund');
      show(`已冲回 ${Math.abs(result.transaction.points)} RBP，交易 ${result.transaction.id}`);
    } catch (error) {
      show(error.message);
    }
  });
  $('#interaction-form').addEventListener('submit',async event=>{event.preventDefault();try{const result=await staffAction({action:'activity',activityId:$('#interaction-activity').value},'activity');show(`已发放 ${result.transaction.points} RBP，交易 ${result.transaction.id}`);}catch(error){show(error.message);}});
})();
