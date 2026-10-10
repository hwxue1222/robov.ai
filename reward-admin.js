(async () => {
  const response = await fetch('/api/robov/settings');
  if (!response.ok) return;
  const data = await response.json();
  const $ = id => document.getElementById(id);
  $('reward-admin').hidden = false;
  $('signup-enabled').checked = data.settings.signupEnabled;
  $('signup-points').value = data.settings.signupPoints;
  const dates={'signup-ends-at':'signupEndsAt','review-ends-at':'reviewEndsAt','voucher-ends-at':'voucherEndsAt'};
  for(const [id,key] of Object.entries(dates)) { const value=data.settings[key];if(value){const date=new Date(value);$(''+id).value=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);} }
  data.credits.forEach(credit => {
    const li = document.createElement('li');
    li.textContent = `${new Date(credit.createdAt).toLocaleString()} / +${credit.points} points / ${credit.walletId}`;
    $('signup-credits').append(li);
  });
  $('reward-settings-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter; button.disabled = true;
    try {
      const campaignDates=Object.fromEntries(Object.entries(dates).map(([id,key])=>[key,$(id).value?new Date($(id).value).toISOString():null]));
      const result = await fetch('/api/robov/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signupEnabled: $('signup-enabled').checked, signupPoints: Number($('signup-points').value),...campaignDates }) });
      if (!result.ok) throw new Error('SETTINGS_UNAVAILABLE');
      $('reward-settings-status').textContent = '设置已保存，仅影响新注册会员';
    } catch (error) { $('reward-settings-status').textContent = error.message; }
    finally { button.disabled = false; }
  });
})().catch(() => {});
