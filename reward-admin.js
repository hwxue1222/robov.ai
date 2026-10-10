(async () => {
  const response = await fetch('/api/robov/settings');
  if (!response.ok) return;
  const data = await response.json();
  const $ = id => document.getElementById(id);
  $('reward-admin').hidden = false;
  $('signup-enabled').checked = data.settings.signupEnabled;
  $('signup-points').value = data.settings.signupPoints;
  data.credits.forEach(credit => {
    const li = document.createElement('li');
    li.textContent = `${new Date(credit.createdAt).toLocaleString()} / +${credit.points} points / ${credit.walletId}`;
    $('signup-credits').append(li);
  });
  $('reward-settings-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter; button.disabled = true;
    try {
      const result = await fetch('/api/robov/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signupEnabled: $('signup-enabled').checked, signupPoints: Number($('signup-points').value) }) });
      if (!result.ok) throw new Error('SETTINGS_UNAVAILABLE');
      $('reward-settings-status').textContent = '设置已保存，仅影响新注册会员';
    } catch (error) { $('reward-settings-status').textContent = error.message; }
    finally { button.disabled = false; }
  });
})().catch(() => {});
