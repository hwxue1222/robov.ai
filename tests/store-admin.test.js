const test=require('node:test'),assert=require('node:assert/strict');const {canManageStore}=require('../lib/robov/store-admin');
test('store reward management requires an ADMIN assignment, not a STAFF assignment on an admin account',async()=>{
  const actor={id:'admin',role:'ADMIN'};
  for(const [role,expected]of[['STAFF',false],['MANAGER',false],['ADMIN',true]])assert.equal(await canManageStore({storeStaff:{findUnique:async()=>({role,active:true})}},actor,'store'),expected);
  assert.equal(await canManageStore({storeStaff:{findUnique:async()=>({role:'ADMIN',active:false})}},actor,'store'),false);
  assert.equal(await canManageStore({}, {role:'SUPERADMIN'},null),true);
});
