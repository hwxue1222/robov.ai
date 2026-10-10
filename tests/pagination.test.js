const test=require('node:test'),assert=require('node:assert/strict');const {pagination,pageMeta}=require('../lib/robov/pagination');
test('record paging defaults to 10, clamps empty/final pages and rejects invalid requests',()=>{
  const input=pagination('/api');assert.equal(input.pageSize,10);assert.equal(pageMeta(input,0).pages,1);
  assert.equal(pageMeta({...input,page:999},25).page,3);
  for(const query of['page=0','page=-1','page=1.5','page=Infinity','pageSize=100000','asOf=invalid'])assert.throws(()=>pagination('/api?'+query),/INVALID_PAGE/);
});
