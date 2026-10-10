const { getReviewTasks } = require('../../lib/robov/rewards');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const enabled = require('../../lib/robov/config').testModeEnabled() && Boolean(process.env.DATABASE_URL);
  try {
    const settings = enabled ? await require('../../lib/robov/signup-reward').rewardSettings(require('../../lib/robov/prisma').getPrisma()) : {};
    const { activityStatus } = require('../../lib/robov/activity-status');
    const reviewStatus = activityStatus(settings.reviewEnabled!==false,settings.reviewEndsAt);
    const db=enabled?require('../../lib/robov/prisma').getPrisma():null;
    const offer=enabled?await require('../../lib/robov/activities').registrationOffer(db,settings):null;
    const activities = [
      { id:'registration',status:enabled ? offer.signupEnabled?'ongoing':activityStatus(settings.signupEnabled,settings.signupEndsAt) : 'unavailable',rewardPoints:enabled ? offer.signupPoints : null,endsAt:settings.signupEndsAt || null },
      { id:'voucher',status:enabled ? activityStatus(settings.voucherEnabled!==false,settings.voucherEndsAt) : 'unavailable',rewardPoints:5,discountCents:500,endsAt:settings.voucherEndsAt || null },
      { id:'google-review',status:reviewStatus,rewardPoints:0,endsAt:settings.reviewEndsAt || null }
    ];
    const custom=enabled?await db.rewardActivity.findMany({where:{deletedAt:null,OR:[{storeId:null},{store:{active:true}}]},include:{store:{select:{name:true}}},orderBy:{createdAt:'desc'},take:100}):[];
    const customActivities=custom.map(({store,...row})=>({...row,...(row.kind==='VOUCHER'?{points:5,minimumSpendCents:Math.max(5000,row.minimumSpendCents)}:{}),storeName:store?.name||null,status:require('../../lib/robov/activities').status(row)}));
    return res.status(200).json({ activities,customActivities,tasks:getReviewTasks().map(task=>({...task,status:reviewStatus,available:task.available && reviewStatus === 'ongoing',url:reviewStatus === 'ongoing'?task.url:null})) });
  } catch { return res.status(503).json({ error:'REWARDS_UNAVAILABLE' }); }
};
