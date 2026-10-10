(async () => {
  const session = await fetch('/api/robov/session');
  if (!session.ok) return;
  const { user } = await session.json();
  if (user?.role !== 'SUPERADMIN') return;
  const $ = id => document.getElementById(id);
  let view = 'activity', asOf = null, memberId = '', busy = false;
  const pager=window.RobovPager([$('activity-pagination-top'),$('activity-pagination-bottom')],page=>load(page));
  $('member-activity-panel').hidden = false;
  for (const store of user.stores) { const option = document.createElement('option'); option.value=store.id; option.textContent=store.name; $('activity-store').append(option); }
  const storeNames = new Map(user.stores.map(store => [store.id,store.name]));
  const actionNames = { MEMBER_INVITED:'邀请码注册', MEMBER_LOGIN:'会员登录', QR_ISSUED:'会员码生成', QR_SCANNED:'会员码扫描', POINTS_EARNED:'积分入账', REDEMPTION_REQUESTED:'兑换申请', REDEMPTION_CONFIRMED:'兑换确认', REFUND_REVERSED:'退款冲回' };
  async function load(page = 1) {
    if (busy) return;
    busy=true; pager.busy(true);$('activity-filter').querySelector('button').disabled=true;
    try {
      const params = new URLSearchParams({ view,page:String(page),pageSize:'10' });
      if (view === 'members') params.set('q',$('activity-search').value.trim());
      else { if (memberId) params.set('memberId',memberId); if ($('activity-store').value) params.set('storeId',$('activity-store').value); }
      if(asOf)params.set('asOf',asOf);
      const response = await fetch('/api/robov/activity?' + params);
      if (!response.ok) throw new Error('ACTIVITY_UNAVAILABLE');
      const data = await response.json();
      $('activity-rows').replaceChildren();
      for (const row of data.rows) {
        const item = document.createElement('article'); item.className='activity-row';item.dataset.recordId=row.id;
        const identity = document.createElement('div'), title=document.createElement('strong'), detail=document.createElement('small');
        const member = view === 'members' ? row : row.member;
        title.textContent=member?.displayName || member?.email || row.memberUserId;
        detail.textContent=member?.email || '';
        detail.dataset.noTranslate=''; title.dataset.noTranslate='';
        identity.append(title,detail); item.append(identity);
        const description=document.createElement('div');
        if (view === 'members') {
          const balance=document.createElement('span'), hold=document.createElement('small'), label=document.createElement('span');
          balance.textContent=`${row.member.pointBalance} points`; label.textContent='冻结中'; hold.append(label,` / ${row.member.pointsOnHold} points`); description.append(balance,hold);
          const button=document.createElement('button'); button.type='button'; button.className='text-button'; button.textContent='查看活动';
          button.addEventListener('click',() => { if(busy)return;memberId=row.id; $('activity-clear-member').hidden=false; setView('activity'); }); item.append(description,button);
        } else {
          const action=document.createElement('span'),store=document.createElement('small'); action.textContent=actionNames[row.action] || row.action; store.textContent=storeNames.get(row.storeId) || '—'; description.append(action,store); item.append(description);
          if (Number.isInteger(row.points)) {
            const points=document.createElement('strong'); points.className='activity-points'; points.textContent=`${row.points > 0 ? '+' : ''}${row.points} ROBOV points`; points.dataset.noTranslate=''; description.insertBefore(points,store);
          }
        }
        const time=document.createElement('time'); time.dateTime=row.createdAt; time.textContent=new Date(row.createdAt).toLocaleString(); item.append(time); $('activity-rows').append(item);
      }
      asOf=data.pagination.asOf;pager.update(data.pagination);$('activity-status').textContent=data.rows.length ? '' : '暂无记录';
    } catch(error) { $('activity-status').textContent=error.message; }
    finally { busy=false; pager.busy(false);$('activity-filter').querySelector('button').disabled=false; }
  }
  function setView(value) {
    if (busy) return;
    view=value; asOf=null;
    document.querySelectorAll('[data-activity-view]').forEach(button => button.setAttribute('aria-selected',String(button.dataset.activityView === view)));
    $('activity-search').disabled=view !== 'members'; $('activity-store').disabled=view !== 'activity';
    load();
  }
  document.querySelectorAll('[data-activity-view]').forEach(button => button.addEventListener('click',() => setView(button.dataset.activityView)));
  $('activity-filter').addEventListener('submit',event => { event.preventDefault();if(busy)return;asOf=null;load(); });
  $('activity-clear-member').addEventListener('click',() => { if(busy)return;memberId='';asOf=null;$('activity-clear-member').hidden=true;load(); });
  setView('activity');
})().catch(() => {});
