(async()=>{
  const response=await fetch('/api/robov/settings');if(!response.ok)return;
  const data=await response.json();document.getElementById('reward-admin').hidden=false;
  document.getElementById('signup-credits').replaceChildren(...data.credits.map(credit=>{const li=document.createElement('li');li.textContent=`${new Date(credit.createdAt).toLocaleString()} / +${credit.points} points / ${credit.walletId}`;return li;}));
})().catch(()=>{});
