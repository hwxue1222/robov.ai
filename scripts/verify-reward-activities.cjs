const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {getPrisma}=require('../lib/robov/prisma');
const {getAuth,ensureRobovUser}=require('../lib/robov/auth');
const {requestRedemption}=require('../lib/robov/ledger');
async function rewards(){const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;}};await require('../api/robov/rewards')({method:'GET'},res);assert.equal(res.code,200);return res.data;}
(async()=>{
  if(process.env.VERCEL_ENV==='production'||new URL(process.env.DATABASE_URL).hostname.replace('-pooler','')!==process.env.ROBOV_TEST_DATABASE_HOST)throw new Error('EXPLICIT_TEST_DATABASE_REQUIRED');
  const db=getPrisma();let original;
  try{
    original=await db.rewardSettings.findUnique({where:{id:'default'}});
    assert((await rewards()).activities.every(activity=>activity.status==='ongoing'));
    await db.rewardSettings.upsert({where:{id:'default'},create:{id:'default',signupEnabled:true,signupPoints:100,signupEndsAt:new Date(0),reviewEndsAt:new Date(0),voucherEndsAt:new Date(0)},update:{signupEnabled:true,signupPoints:100,signupEndsAt:new Date(0),reviewEndsAt:new Date(0),voucherEndsAt:new Date(0)}});
    const expired=await rewards();assert(expired.activities.every(activity=>activity.status==='expired'));assert(expired.tasks.every(task=>!task.available&&!task.url&&task.rewardPoints===0));
    const authUser=(await(await getAuth()).api.signUpEmail({body:{email:`expired-${crypto.randomUUID()}@example.invalid`,name:'Expired Campaign Test',password:crypto.randomBytes(20).toString('hex')}})).user;
    const member=await ensureRobovUser(authUser);const wallet=await db.memberWallet.findUnique({where:{userId:member.id}});assert.equal(wallet.pointBalance,0);
    const admin=await db.robovUser.findUnique({where:{username:'superadmin'}}),store=await db.store.findUnique({where:{slug:'puteri-harbour'}});
    await assert.rejects(requestRedemption(db,{actorUserId:admin.id,storeId:store.id,memberUserId:member.id,points:5,amount:50,receiptNo:'EXP-'+crypto.randomUUID(),dineIn:true,otherPromotion:false,idempotencyKey:crypto.randomUUID()}),/ACTIVITY_EXPIRED/);
    console.log('PASS: centralized ongoing/expired activities, review zero points, expired registration awards zero, expired voucher rejects new requests.');
  }finally{
    if(original)await db.rewardSettings.update({where:{id:'default'},data:{signupEnabled:original.signupEnabled,signupPoints:original.signupPoints,signupEndsAt:original.signupEndsAt,reviewEndsAt:original.reviewEndsAt,voucherEndsAt:original.voucherEndsAt}});
    else await db.rewardSettings.update({where:{id:'default'},data:{signupEnabled:true,signupPoints:100,signupEndsAt:null,reviewEndsAt:null,voucherEndsAt:null}});
    await db.$disconnect();
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
