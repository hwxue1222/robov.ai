const { getPrisma } = require('../../lib/robov/prisma');
const { requireActor } = require('../../lib/robov/auth');
const { requireTestMode } = require('../../lib/robov/config');
const { rewardSettings } = require('../../lib/robov/signup-reward');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireTestMode(res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const actor = await requireActor(req, res, true);
    if (!actor) return;
    if (actor.role !== 'SUPERADMIN') return res.status(403).json({ error: 'SUPERADMIN_REQUIRED' });
    const db = getPrisma();
    if (req.method === 'GET') {
      const {pagination,pageMeta}=require('../../lib/robov/pagination');
      const input=pagination(req.url),where={createdAt:{lte:input.asOf},OR:[{idempotencyKey:{startsWith:'signup:'}},{idempotencyKey:{startsWith:'signup-activity:'}}]};
      const meta=pageMeta(input,await db.pointTransaction.count({where}));
      const credits=await db.pointTransaction.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(meta.page-1)*meta.pageSize,take:meta.pageSize,select:{id:true,walletId:true,points:true,createdAt:true}});
      return res.status(200).json({settings:await rewardSettings(db),credits,pagination:meta});
    }
    const { signupEnabled, signupPoints } = req.body || {};
    if (typeof signupEnabled !== 'boolean' || !Number.isInteger(signupPoints) || signupPoints < 0 || signupPoints > 10000) return res.status(400).json({ error: 'INVALID_REWARD_SETTINGS' });
    let dates;
    try { dates = require('../../lib/robov/activity-status').parseActivityDates(req.body); } catch { return res.status(400).json({ error:'INVALID_ACTIVITY_DATE' }); }
    const settings = await db.$transaction(async tx => {
      const previous = await rewardSettings(tx);
      const updated = await tx.rewardSettings.upsert({ where: { id: 'default' }, create: { id: 'default', signupEnabled, signupPoints, ...dates }, update: { signupEnabled, signupPoints, ...dates } });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: 'REWARD_SETTINGS_UPDATED', targetType: 'RewardSettings', targetId: 'default', metadata: { previous, signupEnabled, signupPoints, ...dates } } });
      return updated;
    });
    return res.status(200).json({ settings });
  } catch(error) { return res.status(error.message==='INVALID_PAGE'?400:503).json({ error:error.message==='INVALID_PAGE'?'INVALID_PAGE':'SETTINGS_UNAVAILABLE' }); }
};
