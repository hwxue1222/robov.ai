(function () {
  const state = { userId: localStorage.getItem('robovMemberUserId'), qrExpiresAt: 0, timer: null };
  const $ = selector => document.querySelector(selector);

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(state.userId ? { 'x-robov-user-id': state.userId } : {}), ...(options.headers || {}) }
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || '请求失败');
    return payload;
  }

  function renderWallet(wallet) {
    $('#available-points').textContent = wallet.availablePoints ?? 0;
    $('#total-points').textContent = wallet.pointBalance ?? 0;
    $('#hold-points').textContent = wallet.pointsOnHold ?? 0;
    $('#ledger-list').replaceChildren(...(wallet.transactions || []).map(item => {
      const row = document.createElement('article');
      row.className = 'ledger-row';
      const amount = document.createElement('strong');
      amount.textContent = `${item.points > 0 ? '+' : ''}${item.points} RBP`;
      const status = document.createElement('span');
      status.textContent = `${item.type} · ${item.status}`;
      const receipt = document.createElement('small');
      receipt.textContent = item.receiptNo || item.id;
      row.append(amount, status, receipt);
      if (item.type === 'REDEEM_HOLD' && item.status === 'PENDING_MEMBER_CONFIRMATION') {
        const confirm = document.createElement('button');
        confirm.type = 'button';
        confirm.className = 'secondary-button';
        confirm.textContent = `确认兑换 ${Math.abs(item.points)} RBP`;
        confirm.addEventListener('click', async () => {
          confirm.disabled = true;
          try {
            await api('/api/robov/redeem', { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ transactionId: item.id }) });
            await refreshWallet();
            $('#member-status').textContent = '兑换已确认';
          } catch (error) { $('#member-status').textContent = error.message; confirm.disabled = false; }
        });
        row.append(confirm);
      }
      return row;
    }));
  }

  function drawPattern(token) {
    const bits = Array.from(token).slice(0, 81).map(ch => ch.charCodeAt(0) % 2);
    $('#qr-pattern').replaceChildren(...Array.from({ length: 81 }, (_, index) => {
      const cell = document.createElement('span');
      cell.className = bits[index] ? 'on' : '';
      return cell;
    }));
  }

  async function refreshWallet() {
    if (!state.userId) return;
    const { wallet } = await api('/api/robov/member');
    renderWallet(wallet);
  }

  async function refreshQr() {
    const { token, expiresAt } = await api('/api/robov/member', { method: 'POST', body: JSON.stringify({ action: 'qr' }) });
    state.qrExpiresAt = new Date(expiresAt).getTime();
    $('#qr-token').textContent = token;
    drawPattern(token);
    clearInterval(state.timer);
    state.timer = setInterval(updateCountdown, 1000);
    updateCountdown();
  }

  function updateCountdown() {
    const seconds = Math.max(0, Math.ceil((state.qrExpiresAt - Date.now()) / 1000));
    $('#qr-countdown').textContent = seconds ? `${seconds}s` : '已过期';
    if (!seconds) clearInterval(state.timer);
  }

  $('#member-login').addEventListener('submit', async event => {
    event.preventDefault();
    $('#member-status').textContent = '正在进入钱包...';
    try {
      const form = new FormData(event.currentTarget);
      const payload = await api('/api/robov/session', { method: 'POST', body: JSON.stringify({ email: form.get('email'), phone: form.get('phone') }) });
      state.userId = payload.user.id;
      localStorage.setItem('robovMemberUserId', state.userId);
      $('#refresh-qr').disabled = false;
      renderWallet({ ...payload.wallet, availablePoints: payload.wallet.pointBalance - payload.wallet.pointsOnHold, transactions: [] });
      await refreshWallet();
      await refreshQr();
      $('#member-status').textContent = '已登录';
    } catch (error) {
      $('#member-status').textContent = error.message;
    }
  });

  $('#refresh-qr').addEventListener('click', () => Promise.all([refreshWallet(), refreshQr()]).catch(error => { $('#member-status').textContent = error.message; }));
  setInterval(() => {
    if (state.userId && !document.hidden) refreshWallet().catch(error => { $('#member-status').textContent = error.message; });
  }, 10000);
  if (state.userId) {
    $('#refresh-qr').disabled = false;
    refreshWallet().catch(error => { $('#member-status').textContent = error.message; });
  }
})();
