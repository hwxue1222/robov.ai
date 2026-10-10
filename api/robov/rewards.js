const { getReviewTasks } = require('../../lib/robov/rewards');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const enabled = process.env.ROBOV_DEMO_MODE === 'true' && process.env.VERCEL_ENV !== 'production' && Boolean(process.env.DATABASE_URL);
  try {
    const settings = enabled ? await require('../../lib/robov/signup-reward').rewardSettings(require('../../lib/robov/prisma').getPrisma()) : {};
    const { activityStatus } = require('../../lib/robov/activity-status');
    const reviewStatus = activityStatus(true,settings.reviewEndsAt);
    const activities = [
      { id:'registration',status:enabled ? activityStatus(settings.signupEnabled,settings.signupEndsAt) : 'unavailable',rewardPoints:enabled ? settings.signupPoints : null,endsAt:settings.signupEndsAt || null },
      { id:'voucher',status:enabled ? activityStatus(true,settings.voucherEndsAt) : 'unavailable',rewardPoints:100,discountCents:500,endsAt:settings.voucherEndsAt || null },
      { id:'google-review',status:reviewStatus,rewardPoints:0,endsAt:settings.reviewEndsAt || null }
    ];
    return res.status(200).json({ activities,tasks:getReviewTasks().map(task=>({...task,status:reviewStatus,available:task.available && reviewStatus === 'ongoing',url:reviewStatus === 'ongoing'?task.url:null})) });
  } catch { return res.status(503).json({ error:'REWARDS_UNAVAILABLE' }); }
};
