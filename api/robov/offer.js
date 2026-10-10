const { rewardSettings } = require('../../lib/robov/signup-reward');
const { getPrisma } = require('../../lib/robov/prisma');
const { requireTestMode } = require('../../lib/robov/config');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  if (!requireTestMode(res)) return;
  try { const settings = await rewardSettings(getPrisma()); const status = require('../../lib/robov/activity-status').activityStatus(settings.signupEnabled,settings.signupEndsAt); return res.status(200).json({ signupEnabled: status === 'ongoing', signupPoints: settings.signupPoints }); }
  catch { return res.status(503).json({ error: 'SETTINGS_UNAVAILABLE' }); }
};
