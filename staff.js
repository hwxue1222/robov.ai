(function () {
  const $ = selector => document.querySelector(selector);
  const state = {
    staffUserId: localStorage.getItem('robovStaffUserId') || '',
    storeId: localStorage.getItem('robovStoreId') || ''
  };

  $('#staff-user').value = state.staffUserId;
  $('#staff-store').value = state.storeId;

  function idempotencyKey(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  async function staffAction(body, keyPrefix) {
    const response = await fetch('/api/robov/staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-robov-user-id': state.staffUserId,
        'x-robov-store-id': state.storeId,
        'idempotency-key': idempotencyKey(keyPrefix)
      },
      body: JSON.stringify({ ...body, qrToken: $('#scan-token').value.trim() })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || '请求失败');
    return payload;
  }

  function show(message) {
    $('#staff-status').textContent = message;
  }

  $('#staff-auth').addEventListener('submit', event => {
    event.preventDefault();
    state.staffUserId = $('#staff-user').value.trim();
    state.storeId = $('#staff-store').value.trim();
    localStorage.setItem('robovStaffUserId', state.staffUserId);
    localStorage.setItem('robovStoreId', state.storeId);
    show('本机门店身份已保存');
  });

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
      const result = await staffAction({ action: 'redeem', points: Number($('#redeem-points').value) }, 'redeem');
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
