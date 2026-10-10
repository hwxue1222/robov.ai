const test=require('node:test');
const assert=require('node:assert/strict');
const {activityStatus,parseActivityDates}=require('../lib/robov/activity-status');
test('reward status respects enabled flag and exact expiry boundary',()=>{
  const end='2026-10-10T10:00:00.000Z',time=Date.parse(end);
  assert.equal(activityStatus(true,null,time),'ongoing');
  assert.equal(activityStatus(true,end,time-1),'ongoing');
  assert.equal(activityStatus(true,end,time),'expired');
  assert.equal(activityStatus(false,null,time),'paused');
  assert.equal(activityStatus(false,end,time),'expired');
});
test('activity dates allow null clearing and reject invalid, rollover and local dates',()=>{
  assert.equal(parseActivityDates({signupEndsAt:null}).signupEndsAt,null);
  assert.equal(parseActivityDates({reviewEndsAt:'2026-10-10T10:00:00.000Z'}).reviewEndsAt.toISOString(),'2026-10-10T10:00:00.000Z');
  for(const date of ['2026-02-30T10:00:00.000Z','2026-10-10T10:00',123,'invalid'])assert.throws(()=>parseActivityDates({voucherEndsAt:date}),/INVALID_ACTIVITY_DATE/);
  assert.deepEqual(parseActivityDates({signupEnabled:true}),{});
});
