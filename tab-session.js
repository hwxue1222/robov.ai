(function(){
  const nativeFetch=window.fetch.bind(window),key='robov-login-handoff';
  let proof=null,navigating=false;
  try{
    const handoff=JSON.parse(sessionStorage.getItem(key)||'null');sessionStorage.removeItem(key);
    const navigation=performance.getEntriesByType('navigation')[0];
    if(navigation?.type==='navigate'&&handoff?.path===location.pathname&&handoff.until>Date.now()&&typeof handoff.proof==='string')proof=handoff.proof;
  }catch{}
  function prepare(url){
    const target=new URL(url,location.href);
    if(target.origin!==location.origin)return;
    try{
      sessionStorage.removeItem(key);
      if(proof)sessionStorage.setItem(key,JSON.stringify({proof,path:target.pathname,until:Date.now()+10000}));
      navigating=true;
    }catch{navigating=false;}
  }
  window.RobovSession={
    navigate(url,newProof){if(newProof)proof=newProof;prepare(url);location.assign(url);},
    clear(){proof=null;try{sessionStorage.removeItem(key);}catch{}}
  };
  window.fetch=(input,options={})=>{
    const url=new URL(input instanceof Request?input.url:input,location.href);
    if(url.origin===location.origin&&url.pathname.startsWith('/api/robov/')){
      const headers=new Headers(options.headers||(input instanceof Request?input.headers:undefined));
      if(proof)headers.set('x-robov-tab-proof',proof);else headers.delete('x-robov-tab-proof');
      return nativeFetch(input,{...options,headers});
    }
    return nativeFetch(input,options);
  };
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest?.('a[href]');
    if(link&&(!link.target||link.target==='_self')&&!link.hasAttribute('download')){
      const target=new URL(link.href,location.href);
      if(target.origin===location.origin&&target.pathname!==location.pathname)prepare(target.href);
    }
  });
  window.addEventListener('pagehide',()=>{
    const closingProof=proof;proof=null;
    const privateView=document.getElementById('staff-main')||document.getElementById('wallet-main');if(privateView)privateView.hidden=true;
    if(!navigating){
      try{sessionStorage.removeItem(key);}catch{}
      if(closingProof)nativeFetch('/api/robov/session',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json','x-robov-tab-proof':closingProof},body:JSON.stringify({action:'close'})}).catch(()=>{});
    }
  });
  window.addEventListener('pageshow',event=>{if(event.persisted){window.RobovSession.clear();if(['/staff.html','/robov.html'].includes(location.pathname))location.replace('./login.html'+(location.pathname==='/staff.html'?'?mode=employee':''));}});
})();
