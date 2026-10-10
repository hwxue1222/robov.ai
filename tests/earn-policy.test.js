const test=require('node:test');const assert=require('node:assert/strict');
const {validatePolicy,rewardForAmount,DEFAULT_POLICY}=require('../lib/robov/earn-policy');
test('whole-bill rates use inclusive lower and exclusive upper boundaries and fallback',()=>{
  const policy=validatePolicy({...DEFAULT_POLICY,tiers:[{id:'middle',minCents:10000,maxCents:20000,rateBps:500},{id:'high',minCents:20000,maxCents:null,rateBps:750}]});
  assert.equal(rewardForAmount(9999,policy).rateBps,300);
  assert.equal(rewardForAmount(10000,policy).rateBps,500);
  assert.equal(rewardForAmount(19999,policy).points,9);
  assert.equal(rewardForAmount(20000,policy).points,15);
  assert.equal(rewardForAmount(100000,DEFAULT_POLICY).points,30);
  assert.throws(()=>rewardForAmount(10000,{...policy,enabled:false}),/EARN_REWARDS_DISABLED/);
});
test('overlapping, duplicate, fractional, negative or oversized tier settings are rejected',()=>{
  const tier={id:'first',minCents:0,maxCents:20000,rateBps:300};
  assert.throws(()=>validatePolicy({...DEFAULT_POLICY,tiers:[tier,{...tier,id:'second',minCents:10000}]}),/OVERLAPPING/);
  for(const change of [{maxCents:0},{minCents:-1},{minCents:1.5},{rateBps:10001},{rateBps:-1}])assert.throws(()=>validatePolicy({...DEFAULT_POLICY,tiers:[{...tier,...change}]}),/INVALID/);
  assert.throws(()=>validatePolicy({...DEFAULT_POLICY,tiers:[tier,tier]}),/INVALID/);
});
