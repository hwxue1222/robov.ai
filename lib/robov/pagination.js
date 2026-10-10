function pagination(url){
  const params=new URL(url||'/','https://robov.ai').searchParams;
  const page=Number(params.get('page')||1),pageSize=Number(params.get('pageSize')||10);
  if(!Number.isInteger(page)||page<1||page>1000000||![10,20,50].includes(pageSize))throw Error('INVALID_PAGE');
  const value=params.get('asOf');
  const asOf=value?new Date(value):new Date();
  if(!Number.isFinite(asOf.getTime())||asOf.getTime()>Date.now()+5000)throw Error('INVALID_PAGE');
  return {page,pageSize,asOf};
}
function pageMeta(input,total){const pages=Math.max(1,Math.ceil(total/input.pageSize)),page=Math.min(input.page,pages);return {page,pages,pageSize:input.pageSize,total,asOf:input.asOf.toISOString()};}
module.exports={pagination,pageMeta};
