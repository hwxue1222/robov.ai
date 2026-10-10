window.RobovPager=function(roots,onPage){
  let meta={page:1,pages:1,total:0},busy=false;
  const controls=roots.map(root=>{
    const previous=document.createElement('button'),next=document.createElement('button'),status=document.createElement('span');
    root.className='records-pagination';previous.type=next.type='button';previous.className=next.className='secondary-button';previous.textContent='上一页';next.textContent='下一页';previous.dataset.pageAction='previous';next.dataset.pageAction='next';status.dataset.noTranslate='';
    previous.addEventListener('click',()=>{if(!busy&&meta.page>1)onPage(meta.page-1);});next.addEventListener('click',()=>{if(!busy&&meta.page<meta.pages)onPage(meta.page+1);});root.replaceChildren(previous,status,next);return {previous,next,status};
  });
  function render(){const lang=localStorage.getItem('robov-language')||'zh';for(const {previous,next,status}of controls){previous.disabled=busy||meta.page<=1;next.disabled=busy||meta.page>=meta.pages;status.textContent=lang==='ms'?`Halaman ${meta.page} daripada ${meta.pages} / ${meta.total} rekod`:lang==='en'?`Page ${meta.page} of ${meta.pages} / ${meta.total} records`:`第 ${meta.page} / ${meta.pages} 页 / 共 ${meta.total} 条`;}}
  window.addEventListener('robov:language',render);render();return {update(value){meta=value;render();},busy(value){busy=value;render();}};
};
