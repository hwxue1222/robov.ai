(async function(){
  const $=id=>document.getElementById(id),make=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
  let rows=[],editing=null,role='',loadId=0,canManageScope=false;
  const session=await fetch('/api/robov/session').then(r=>r.json());role=session.user?.role||'';
  const canManage=['ADMIN','SUPERADMIN'].includes(role);$('activity-management').hidden=!canManage;
  $('campaign-scope').querySelector('[value="global"]').disabled=role!=='SUPERADMIN';
  function voucherSelection(){const selected=rows.find(row=>row.id===$('redeem-activity').value)||rows.find(row=>row.id==='voucher');if(!selected)return;$('redeem-points').value=5;$('redeem-amount').dataset.minimum=Math.max(50,selected.minimumSpendCents/100);}
  function editorFields(){const kind=$('campaign-kind').value;$('campaign-points').readOnly=kind==='VOUCHER'||Boolean(editing?.builtin&&editing.id!=='registration');if(kind==='VOUCHER')$('campaign-points').value=5;$('campaign-voucher-fields').hidden=kind!=='VOUCHER';$('campaign-link-field').hidden=kind!=='INTERACTION';$('campaign-discount').required=kind==='VOUCHER';$('campaign-minimum').required=kind==='VOUCHER';$('campaign-scope').disabled=kind==='SIGNUP'||Boolean(editing);}
  function edit(row=null){
    editing=row;$('campaign-editor').hidden=false;
    $('campaign-title').value=row?.title||'';$('campaign-points').value=row?.points??( $('campaign-kind').value==='SIGNUP'?100:0 );
    $('campaign-scope').value=row?(row.storeId===null?'global':'store'):($('campaign-kind').value==='SIGNUP'?'global':'store');
    $('campaign-discount').value=(row?.discountCents||500)/100;$('campaign-minimum').value=(row?.minimumSpendCents||5000)/100;$('campaign-url').value=row?.url||'';
    $('campaign-enabled').checked=row?row.enabled:true;
    const date=row?.endsAt?new Date(row.endsAt):null;$('campaign-end').value=date?new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16):'';
    $('campaign-title').readOnly=Boolean(row?.builtin);$('campaign-points').readOnly=Boolean(row?.builtin&&row.id!=='registration');
    $('campaign-discount').readOnly=Boolean(row?.builtin);$('campaign-minimum').readOnly=Boolean(row?.builtin);editorFields();
    $('campaign-title').focus();
  }
  async function mutate(body){const response=await fetch('/api/robov/activities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw Error(result.error||'ACTIVITIES_UNAVAILABLE');return result;}
  function render(){
    $('campaign-list').replaceChildren();
    const kind=$('campaign-kind').value;$('new-campaign').disabled=!canManageScope||(kind==='SIGNUP'&&role!=='SUPERADMIN');
    for(const row of rows.filter(r=>r.kind===kind&&(!r.deletedAt||$('show-archived-campaigns').checked))){
      const item=make('div');item.className='campaign-row';const info=make('div'),title=make('strong',row.title);title.dataset.noTranslate='';
      info.append(title,make('p',`${row.points} points${row.kind==='VOUCHER'?` / RM${(row.discountCents/100).toFixed(2)}`:''}`),make('span',row.deletedAt?'已归档':({ongoing:'进行中',expired:'已结束',paused:'已暂停'})[row.status]));
      const scope=make('span',row.storeId?'当前门店':'全部门店');info.append(' / ',scope);item.append(info);
      if(row.canManage){const commands=make('div');commands.className='camera-tools';
        if(!row.deletedAt){const change=make('button','编辑');change.type='button';change.className='secondary-button';change.addEventListener('click',()=>edit(row));commands.append(change);}
        const remove=make('button',row.deletedAt||(row.builtin&&!row.enabled)?'恢复':'删除');remove.type='button';remove.className='secondary-button';remove.addEventListener('click',async()=>{
          remove.disabled=true;try{await mutate({action:row.deletedAt||(row.builtin&&!row.enabled)?'restore':'archive',id:row.id,version:row.version,storeId:row.storeId||'global'});$('campaign-editor').hidden=true;await load();$('campaign-manager-status').textContent='活动已更新';}catch(error){$('campaign-manager-status').textContent=error.message;}finally{remove.disabled=false;}
        });commands.append(remove);item.append(commands);
      }$('campaign-list').append(item);
    }
  }
  async function load(){
    const storeId=$('staff-store').value;if(!storeId)return;const attempt=++loadId;
    const response=await fetch('/api/robov/activities?storeId='+encodeURIComponent(storeId)+'&includeArchived='+$('show-archived-campaigns').checked);if(!response.ok)throw Error('ACTIVITIES_UNAVAILABLE');const data=await response.json();if(attempt!==loadId)return;rows=data.activities;canManageScope=data.canManageStore;
    const vouchers=rows.filter(row=>row.kind==='VOUCHER'&&row.status==='ongoing');$('redeem-activity').replaceChildren(...vouchers.map(row=>{const option=make('option',`${row.title} / ${row.points} points`);option.value=row.builtin?'':row.id;return option;}));document.querySelector('#redeem-form button[type="submit"]').disabled=!vouchers.length;voucherSelection();
    const interactions=rows.filter(row=>row.kind==='INTERACTION'&&row.points>0&&row.status==='ongoing');$('interaction-activity').replaceChildren(...interactions.map(row=>{const option=make('option',`${row.title} / ${row.points} points`);option.value=row.id;return option;}));$('interaction-form').hidden=!interactions.length;
    if(canManage)render();
  }
  $('redeem-activity').addEventListener('change',voucherSelection);
  $('campaign-kind').addEventListener('change',()=>{$('campaign-editor').hidden=true;render();});
  $('show-archived-campaigns').addEventListener('change',()=>load().catch(error=>{$('campaign-manager-status').textContent=error.message;}));
  $('new-campaign').addEventListener('click',()=>edit());$('cancel-campaign').addEventListener('click',()=>{$('campaign-editor').hidden=true;});
  $('campaign-editor').addEventListener('submit',async event=>{
    event.preventDefault();const button=event.submitter;button.disabled=true;const storeId=editing?editing.storeId||'global':$('campaign-scope').value==='global'?'global':$('staff-store').value;
    try{await mutate({action:editing?'update':'create',id:editing?.id,version:editing?.version,storeId,kind:$('campaign-kind').value,title:$('campaign-title').value,points:Number($('campaign-points').value),discountCents:Math.round(Number($('campaign-discount').value)*100),minimumSpendCents:Math.round(Number($('campaign-minimum').value)*100),url:$('campaign-url').value,enabled:$('campaign-enabled').checked,endsAt:$('campaign-end').value?new Date($('campaign-end').value).toISOString():null});$('campaign-editor').hidden=true;await load();$('campaign-manager-status').textContent='活动已保存';
    }catch(error){$('campaign-manager-status').textContent=error.message;}finally{button.disabled=false;}
  });
  $('staff-store').addEventListener('change',()=>{$('campaign-editor').hidden=true;load().catch(error=>{$('campaign-manager-status').textContent=error.message;});});
  new MutationObserver(()=>load().catch(()=>{})).observe($('staff-store'),{childList:true});
  load().catch(()=>{});
})().catch(()=>{});
