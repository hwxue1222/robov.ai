const test=require('node:test'),assert=require('node:assert/strict');
const {requestRedemption}=require('../lib/robov/ledger');
function fixture(activity=null){
  const wallet={id:'wallet',pointBalance:100,pointsOnHold:0};
  const tx={store:{findUnique:async()=>({active:true})},robovUser:{findUnique:async()=>({role:'SUPERADMIN'})},pointTransaction:{findUnique:async()=>null,create:async({data})=>({id:'hold',...data})},rewardSettings:{findUnique:async()=>null},rewardActivity:{findUnique:async()=>activity},memberWallet:{findUnique:async()=>wallet,updateMany:async({data})=>{wallet.pointsOnHold+=data.pointsOnHold.increment;return {count:1};}},auditLog:{create:async()=>{}}};
  return {wallet,db:{$transaction:fn=>fn(tx)}};
}
const input={points:5,amount:50,receiptNo:'TEST-50',dineIn:true,otherPromotion:false};
test('RM50 and RM50.01 reserve exactly five points without deducting balance',async()=>{
  for(const amount of [50,50.01]){const {db,wallet}=fixture();const result=await requestRedemption(db,{...input,amount});assert.equal(result.transaction.points,-5);assert.equal(wallet.pointBalance,100);assert.equal(wallet.pointsOnHold,5);}
});
test('below RM50 and forged point quantities are rejected even for custom vouchers',async()=>{
  for(const amount of [1,49,49.99])await assert.rejects(requestRedemption({}, {...input,amount,activityId:'custom'}),/没有满足最低消费金额/);
  for(const points of [0,4,6,100])await assert.rejects(requestRedemption({}, {...input,points,activityId:'custom'}),/VOUCHER_REQUIRES_5_POINTS/);
});
test('existing custom voucher quantities cannot override five points; higher campaign minimum is retained',async()=>{
  const activity={id:'custom',kind:'VOUCHER',points:100,discountCents:500,minimumSpendCents:6000,enabled:true};
  await assert.rejects(requestRedemption(fixture(activity).db,{...input,activityId:'custom'}),/没有满足最低消费金额/);
  const result=await requestRedemption(fixture(activity).db,{...input,amount:60,activityId:'custom'});assert.equal(result.transaction.points,-5);
});
