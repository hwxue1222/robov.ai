const test=require('node:test'),assert=require('node:assert/strict');
const {activityDetails}=require('../lib/robov/activity-details');
test('activity amounts come from the matching member ledger, not balances or incomplete audit metadata',async()=>{
  const rows=[{targetType:'PointTransaction',targetId:'credit',memberUserId:'member'},{targetType:'PointTransaction',targetId:'hold',memberUserId:'member'},{targetType:'PointTransaction',targetId:'other',memberUserId:'member'},{targetType:'AuthUser',targetId:'login',memberUserId:'member'}];
  const db={pointTransaction:{findMany:async()=>[{id:'credit',points:100,wallet:{userId:'member'}},{id:'hold',points:-5,wallet:{userId:'member'}},{id:'other',points:500,wallet:{userId:'other'}}]}};
  assert.deepEqual((await activityDetails(db,rows)).map(row=>row.points),[100,-5,null,null]);
});
