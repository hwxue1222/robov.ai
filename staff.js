(function () {
  const $ = selector => document.querySelector(selector);
  const state = {
    storeId: localStorage.getItem('robovStoreId') || ''
  };

  function idempotencyKey(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  async function staffAction(body, keyPrefix) {
    const response = await fetch('/api/robov/staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'idempotency-key': idempotencyKey(keyPrefix)
      },
      body: JSON.stringify({ ...body, storeId: state.storeId, qrToken: $('#scan-token').value.trim() })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || '请求失败');
    return payload;
  }

  function show(message) {
    $('#staff-status').textContent = message;
  }

  $('#staff-store').addEventListener('change', () => {
    state.storeId = $('#staff-store').value;
    localStorage.setItem('robovStoreId', state.storeId);
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
      const result = await staffAction({ action: 'redeem', points: 100, amount: $('#redeem-amount').value, receiptNo: $('#redeem-receipt').value, dineIn: $('#redeem-eligible').checked, otherPromotion: !$('#redeem-eligible').checked }, 'redeem');
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
})();
