(async()=>{
  const $=id=>document.getElementById(id);let busy=false,asOf=null;
  const pager=window.RobovPager([$ ('signup-pagination-top'),$('signup-pagination-bottom')],page=>load(page));
  async function load(page=1){
    if(busy)return;busy=true;pager.busy(true);
    try{
      const query=new URLSearchParams({page:String(page),pageSize:'10'});if(asOf)query.set('asOf',asOf);
      const response=await fetch('/api/robov/settings?'+query);if(!response.ok){if(response.status===403||response.status===401)return;throw Error('SETTINGS_UNAVAILABLE');}
      const data=await response.json();$('reward-admin').hidden=false;asOf=data.pagination.asOf;pager.update(data.pagination);
      $('signup-credits').replaceChildren(...data.credits.map(credit=>{const li=document.createElement('li');li.textContent=`${new Date(credit.createdAt).toLocaleString()} / +${credit.points} points / ${credit.walletId}`;return li;}));$('signup-records-status').textContent=data.credits.length?'':'暂无记录';
    }catch(error){$('signup-records-status').textContent=error.message;}finally{busy=false;pager.busy(false);}
  }
  await load();
})().catch(()=>{});
