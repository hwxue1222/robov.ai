(function () {
  const state = { userId: null, qrExpiresAt: 0, timer: null, refreshing: false, walletLoading: false, deciding: false, pendingKey: null, popupId: null };
  const $ = selector => document.querySelector(selector);
  window.RobovQR.icons();
  const popupSeen = new Set();
  function popup(pending) {
    const dialog = $('#redemption-dialog'); if (dialog.open || document.hidden || state.deciding) return;
    const item = pending.find(row => !popupSeen.has(row.id)); if (!item) return;
    popupSeen.add(item.id);
    state.popupId = item.id;
    $('#redemption-dialog-store').textContent = item.store?.name || '';
    $('#redemption-dialog-amount').textContent = `${Math.abs(item.points)} points / RM${((item.metadata?.discountCents || 0) / 100).toFixed(2)}`;
    $('#redemption-dialog-receipt').textContent = item.receiptNo;
    for (const action of ['confirm', 'cancel']) $('#redemption-dialog-' + action).onclick = () => {
      dialog.close();
      const row = Array.from($('#pending-redemption-list').children).find(row => row.dataset.transactionId === item.id);
      row?.querySelector(`[data-redemption-action="${action}"]`)?.click();
    };
    dialog.showModal();
    $('#redemption-dialog-title').focus({ preventScroll: true });
  }
  $('#redemption-dialog').addEventListener('cancel', event => event.preventDefault());

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
    const pending = wallet.pendingRedemptions || [], key = pending.map(row => row.id).join(':');
    if ($('#redemption-dialog').open && !pending.some(row => row.id === state.popupId)) $('#redemption-dialog').close();
    $('#pending-redemptions').hidden = !wallet.pendingCount;
    $('#pending-redemption-count').textContent = wallet.pendingCount || '';
    if (key !== state.pendingKey && !state.deciding) {
      state.pendingKey = key;
      $('#pending-redemption-list').replaceChildren(...pending.map(item => {
        const row = document.createElement('article'); row.className = 'pending-redemption-row'; row.dataset.transactionId = item.id;
        const title = document.createElement('strong'); title.textContent = `${Math.abs(item.points)} points / RM${((item.metadata?.discountCents || 0) / 100).toFixed(2)}`;
        const store = document.createElement('p'); store.dataset.noTranslate = ''; store.textContent = item.store?.name || '';
        const receipt = document.createElement('p'); receipt.dataset.noTranslate = ''; receipt.textContent = item.receiptNo;
        const actions = document.createElement('div'); actions.className = 'camera-tools';
        for (const [action, label] of [['confirm', '确认兑换'], ['cancel', '拒绝兑换']]) {
          const button = document.createElement('button'); button.type = 'button'; button.className = action === 'confirm' ? 'primary-button' : 'secondary-button'; button.textContent = label;
          button.dataset.redemptionAction = action;
          button.addEventListener('click', async () => {
            if (state.deciding) return; state.deciding = true;
            for (const control of $('#pending-redemption-list').querySelectorAll('button')) control.disabled = true;
            try { await api('/api/robov/redeem', { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ action, transactionId: item.id }) }); $('#member-status').textContent = action === 'confirm' ? '兑换已确认' : '兑换已拒绝，预留积分已释放'; }
            catch (error) { $('#member-status').textContent = error.message; }
            finally { state.deciding = false; state.pendingKey = null; await refreshWallet().catch(error => { $('#member-status').textContent = error.message; }); }
          }); actions.append(button);
        }
        row.append(title, store, receipt, actions); return row;
      }));
      if (pending.length && !document.hidden) $('#pending-redemptions').scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    popup(pending);
    $('#ledger-list').replaceChildren(...(wallet.transactions || []).map(item => {
      const row = document.createElement('article');
      row.className = 'ledger-row';
      const amount = document.createElement('strong');
      amount.textContent = ['PENDING_MEMBER_CONFIRMATION', 'VOIDED'].includes(item.status) ? `${Math.abs(item.points)} RBP` : `${item.points > 0 ? '+' : ''}${item.points} RBP`;
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
      return row;
    }));
  }

  async function refreshWallet() {
    if (!state.userId || state.walletLoading || state.deciding) return;
    state.walletLoading = true;
    $('#refresh-wallet').disabled = true;
    try { const { wallet } = await api('/api/robov/member'); if (!state.deciding) renderWallet(wallet); }
    finally { state.walletLoading = false; $('#refresh-wallet').disabled = state.deciding; }
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
  $('#refresh-wallet').addEventListener('click', () => refreshWallet().catch(error => { $('#member-status').textContent = error.message; }));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.userId) refreshWallet().catch(error => { $('#member-status').textContent = error.message; });
    if (!document.hidden && state.userId && state.qrExpiresAt <= Date.now()) refreshQr().catch(error => { $('#member-status').textContent = error.message; });
  });
  setInterval(() => {
    if (state.userId && !document.hidden) refreshWallet().catch(error => { $('#member-status').textContent = error.message; });
  }, 2000);
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
