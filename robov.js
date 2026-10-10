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
      row.innerHTML = `<strong>${item.points > 0 ? '+' : ''}${item.points} RBP</strong><span>${item.type} · ${item.status}</span><small>${item.receiptNo || item.id}</small>`;
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

  $('#refresh-qr').addEventListener('click', refreshQr);
  if (state.userId) {
    $('#refresh-qr').disabled = false;
    refreshWallet().catch(error => { $('#member-status').textContent = error.message; });
  }
})();
