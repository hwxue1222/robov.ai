const test=require('node:test'),assert=require('node:assert/strict');
const {validateActivity,status,builtinRows}=require('../lib/robov/activities');
test('campaign validation accepts independent signup, vouchers and manually approved interactions',()=>{
  const base={kind:'SIGNUP',title:'Welcome',points:25,enabled:true};assert.equal(validateActivity(base).points,25);
  assert.equal(validateActivity({...base,kind:'VOUCHER',points:5,discountCents:1000,minimumSpendCents:5000}).discountCents,1000);
  assert.throws(()=>validateActivity({...base,kind:'VOUCHER',points:5,discountCents:1000,minimumSpendCents:500}),/INVALID/);
  assert.throws(()=>validateActivity({...base,kind:'INTERACTION',title:'Google Review'}),/GOOGLE_REVIEW_NO_REWARDS/);
  assert.throws(()=>validateActivity({...base,kind:'INTERACTION',url:'https://maps.google.com/test'}),/GOOGLE_REVIEW_NO_REWARDS/);
  assert.throws(()=>validateActivity({...base,url:'javascript:alert(1)'}),/INVALID_ACTIVITY_URL/);
  assert.equal(status({...base,deletedAt:new Date()}),'paused');
  assert.equal(builtinRows({signupPoints:100,signupEnabled:true,voucherEnabled:false,reviewEnabled:false})[1].enabled,false);
});
