(function () {
  const state = { userId: null, qrExpiresAt: 0, timer: null, refreshing: false };
  const $ = selector => document.querySelector(selector);

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
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
      const kind = document.createElement('span');
      kind.textContent = item.metadata?.reason === 'SIGNUP_BONUS' ? '注册奖励' : item.metadata?.reason==='INTERACTION_REWARD'?'互动奖励':({ EARN: '消费积分', REDEEM_HOLD: '积分兑换', REFUND_REVERSAL: '退款冲回' })[item.type] || item.type;
      const stage = document.createElement('span');
      stage.textContent = ({ POSTED: '已入账', PENDING_MEMBER_CONFIRMATION: '等待会员确认', REVERSED: '已冲回', VOIDED: '已取消' })[item.status] || item.status;
      status.append(kind, ' · ', stage);
      const receipt = document.createElement('small');
      receipt.textContent = item.receiptNo || item.id;
      row.append(amount, status, receipt);
      if(item.metadata?.title||item.metadata?.activityTitle){const title=document.createElement('small');title.dataset.noTranslate='';title.textContent=item.metadata.title||item.metadata.activityTitle;row.append(title);}
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

  async function refreshWallet() {
    if (!state.userId) return;
    const { wallet } = await api('/api/robov/member');
    renderWallet(wallet);
  }

  async function refreshQr() {
    if (state.refreshing) return;
    state.refreshing = true;
    try {
    const { token, expiresAt } = await api('/api/robov/member', { method: 'POST', body: JSON.stringify({ action: 'qr' }) });
    state.qrExpiresAt = new Date(expiresAt).getTime();
    $('#qr-token').textContent = token;
    await window.RobovQR.render($('#qr-pattern'), token);
    clearInterval(state.timer);
    state.timer = setInterval(updateCountdown, 1000);
    updateCountdown();
    } finally { state.refreshing = false; }
  }

  function updateCountdown() {
    const seconds = Math.max(0, Math.ceil((state.qrExpiresAt - Date.now()) / 1000));
    $('#qr-countdown').textContent = seconds ? `${seconds}s` : '已过期';
    if (!seconds) {
      clearInterval(state.timer);
      $('#qr-pattern').getContext('2d').clearRect(0, 0, 512, 512);
      $('#qr-token').textContent = '已过期';
      if (!document.hidden) refreshQr().catch(error => { $('#member-status').textContent = error.message; });
    }
  }

  $('#refresh-qr').addEventListener('click', () => Promise.all([refreshWallet(), refreshQr()]).catch(error => { $('#member-status').textContent = error.message; }));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.userId && state.qrExpiresAt <= Date.now()) refreshQr().catch(error => { $('#member-status').textContent = error.message; });
  });
  setInterval(() => {
    if (state.userId && !document.hidden) refreshWallet().catch(error => { $('#member-status').textContent = error.message; });
  }, 10000);
  (async () => {
    const { user } = await api('/api/robov/session');
    if (!user) { location.replace('./login.html?mode=member'); return; }
    state.userId = user.id;
    $('#wallet-main').hidden = false;
    $('#member-name').textContent = user.displayName || 'ROBOV Member';
    $('#member-email').textContent = user.email || '';
    $('#refresh-qr').disabled = false;
    await refreshWallet();
    await refreshQr();
  })().catch(() => location.replace('./login.html?mode=member'));
})();
