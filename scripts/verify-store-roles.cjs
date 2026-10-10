const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { getPrisma } = require('../lib/robov/prisma');
const { actorForAuthUser } = require('../lib/robov/auth');
const { earnPoints } = require('../lib/robov/ledger');
async function call(route,method,body,cookie,url) {
  const req={method,body,url:url || '/api/robov/'+route,headers:{origin:'http://localhost:4173','content-type':'application/json',...(cookie ? {cookie}: {})}};
  const res={code:200,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(c){this.code=c;return this;},json(data){this.data=data;}};
  await require('../api/robov/'+route)(req,res);return res;
}
(async () => {
  if (process.env.VERCEL_ENV === 'production' || new URL(process.env.DATABASE_URL).hostname.replace('-pooler','') !== process.env.ROBOV_TEST_DATABASE_HOST) throw new Error('EXPLICIT_TEST_DATABASE_REQUIRED');
  process.env.ROBOV_AUTH_BASE_URL='http://localhost:4173';
  const db=getPrisma();
  try {
    const admin=await db.robovUser.findUnique({where:{username:'admin'}}), superadmin=await db.robovUser.findUnique({where:{username:'superadmin'}});
    const future=await db.store.create({data:{slug:'future-'+crypto.randomUUID(),name:'Future Test Store'}});
    const local=await actorForAuthUser(admin.authUserId), global=await actorForAuthUser(superadmin.authUserId);
    assert.equal(local.stores.length,3);assert(!local.stores.some(s=>s.id===future.id));assert(global.stores.some(s=>s.id===future.id));
    const input={actorUserId:admin.id,storeId:future.id,memberUserId:admin.id,amount:100,receiptNo:'ROLE-'+crypto.randomUUID(),idempotencyKey:crypto.randomUUID()};
    await assert.rejects(earnPoints(db,input),/STAFF_FORBIDDEN/);
    assert.equal((await earnPoints(db,{...input,actorUserId:superadmin.id})).transaction.points,3);
    for (const [username,file,role] of [['admin',process.env.ROBOV_ADMIN_CREDENTIAL_FILE,'ADMIN'],['superadmin',process.env.ROBOV_SUPERADMIN_CREDENTIAL_FILE,'SUPERADMIN']]) {
      const password=fs.readFileSync(file,'utf8').match(/Password: (.+)/)[1];
      const login=await call('session','POST',{action:'login',mode:'employee',identifier:username,password});assert.equal(login.code,200,JSON.stringify(login.data));
      assert.equal(login.data.user.role,role);
      const cookie=login.headers['set-cookie'].map(s=>s.split(';')[0]).join('; ');
      assert.equal((await call('settings','GET',null,cookie)).code,role==='SUPERADMIN'?200:403);
      const activities=await call('activity','GET',null,cookie);
      assert.equal(activities.code,role==='SUPERADMIN'?200:403);
      if (role==='SUPERADMIN') {
        assert(activities.data.rows.length>0);assert(activities.data.rows.length<=30);
        const members=await call('activity','GET',null,cookie,'/api/robov/activity?view=members');assert.equal(members.code,200);assert(members.data.rows.length>0);
        assert(!JSON.stringify(members.data).includes('authUserId'));assert(!JSON.stringify(members.data).includes('password'));
        const filtered=await call('activity','GET',null,cookie,'/api/robov/activity?storeId='+future.id);assert(filtered.data.rows.every(row=>row.storeId===future.id));
        const audit=await db.auditLog.count({where:{actorUserId:superadmin.id,action:'MEMBER_ACTIVITY_VIEWED'}});assert(audit>=3);
      }
      await call('session','POST',{action:'logout'},cookie);
    }
    assert.equal((await call('activity','GET')).code,401);
    console.log('PASS: admin bound to exactly three stores; newly added store auto-access for superadmin only; ledger and API permission denial; global settings/member directory/activity with view audit.');
  } finally { await db.$disconnect(); }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
