(function(){
  const $=id=>document.getElementById(id);let policy=null,loading=0;
  const make=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
  function addTier(tier={id:crypto.randomUUID(),minCents:0,maxCents:null,rateBps:300}){
    const row=make('div');row.className='earn-tier';row.dataset.id=tier.id;
    for(const [key,label,value] of [['min','消费金额起（RM）',tier.minCents/100],['max','消费金额止（不含，RM）',tier.maxCents===null?'':tier.maxCents/100],['rate','奖励比例（%）',tier.rateBps/100]]){
      const field=make('label',label),input=make('input');input.type='number';input.min='0';input.step='0.01';input.dataset.field=key;input.value=value;input.required=key!=='max';if(key==='max')input.placeholder='不限';if(key==='rate')input.max='100';field.append(input);row.append(field);
    }
    const remove=make('button','删除');remove.type='button';remove.className='secondary-button';remove.title='删除金额区间';remove.addEventListener('click',()=>row.remove());row.append(remove);$('earn-tiers').append(row);
  }
  function preview(){
    const amount=Math.round(Number($('amount').value)*100);if(!policy||!Number.isFinite(amount)||amount<=0){$('earn-preview').textContent='';return;}
    if(!policy.enabled){$('earn-preview').textContent='消费积分已停用';return;}
    const tier=policy.tiers.find(t=>amount>=t.minCents&&(t.maxCents===null||amount<t.maxCents)),rate=tier?tier.rateBps:policy.baseRateBps;
    const points=Math.floor(amount*rate/1000000),el=$('earn-preview');el.replaceChildren(make('span','本次奖励'),` / ${rate/100}% / ${points} points`);
  }
  async function load(){
    const storeId=$('staff-store').value;if(!storeId)return;const attempt=++loading;policy=null;preview();$('earn-policy-panel').hidden=true;
    const response=await fetch('/api/robov/earn-policy?storeId='+encodeURIComponent(storeId));
    if(attempt!==loading)return;if(!response.ok){$('earn-preview').textContent='消费规则暂不可用';return;}
    const data=await response.json();if(attempt!==loading)return;policy=data.policy;preview();
    if(!data.canManage)return;
    $('earn-policy-panel').hidden=false;$('earn-enabled').checked=policy.enabled;$('earn-base-rate').value=policy.baseRateBps/100;$('earn-tiers').replaceChildren();policy.tiers.forEach(addTier);$('earn-policy-status').textContent='';
  }
  $('staff-store').addEventListener('change',()=>load().catch(()=>{$('earn-preview').textContent='消费规则暂不可用';}));
  $('amount').addEventListener('input',preview);$('add-earn-tier').addEventListener('click',()=>addTier());
  $('earn-policy-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!policy)return;const storeId=$('staff-store').value,version=policy.version,button=event.submitter;button.disabled=true;
    try{
      const cents=value=>{const n=Number(value)*100;if(!Number.isFinite(n)||Math.abs(n-Math.round(n))>0.00001)throw new Error('INVALID_EARN_POLICY');return Math.round(n);};
      const tiers=Array.from($('earn-tiers').children).map(row=>({id:row.dataset.id,minCents:cents(row.querySelector('[data-field="min"]').value),maxCents:row.querySelector('[data-field="max"]').value===''?null:cents(row.querySelector('[data-field="max"]').value),rateBps:cents(row.querySelector('[data-field="rate"]').value)}));
      const response=await fetch('/api/robov/earn-policy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({storeId,version,enabled:$('earn-enabled').checked,baseRateBps:cents($('earn-base-rate').value),tiers})});
      const result=await response.json();if(storeId!==$('staff-store').value)return;if(!response.ok)throw new Error(result.error||'POLICY_UNAVAILABLE');
      policy=result.policy;preview();$('earn-policy-status').textContent='消费规则已保存，仅影响新交易';
    }catch(error){$('earn-policy-status').textContent=error.message;}finally{button.disabled=false;}
  });
  new MutationObserver(()=>load().catch(()=>{})).observe($('staff-store'),{childList:true});
  load().catch(()=>{});
})();
