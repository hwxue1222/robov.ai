const { requireActor } = require('../../lib/robov/auth');
const { requireTestMode } = require('../../lib/robov/config');
const { getPrisma } = require('../../lib/robov/prisma');
const { requireSuperadmin, saveProfile } = require('../../lib/robov/store-profiles');
const { pagination, pageMeta } = require('../../lib/robov/pagination');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireTestMode(res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const actor = await requireActor(req, res, true); if (!actor) return;
    requireSuperadmin(actor); const db = getPrisma();
    if (req.method === 'POST') return res.status(req.body?.id ? 200 : 201).json({ row: await saveProfile(db, actor, req.body || {}) });
    const input = pagination(req.url), where = { createdAt: { lte: input.asOf } }, meta = pageMeta(input, await db.store.count({ where }));
    return res.status(200).json({ rows: await db.store.findMany({ where, include: { merchant: { select: { name: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (meta.page - 1) * meta.pageSize, take: meta.pageSize }), merchants: await db.merchant.findMany({ orderBy: { name: 'asc' } }), pagination: meta });
  } catch (error) {
    const code = error.code === 'P2002' ? 'STORE_CODE_EXISTS' : error.message;
    const known = ['SUPERADMIN_REQUIRED', 'INVALID_STORE_PROFILE', 'STORE_PROFILE_CONFLICT', 'STORE_CODE_EXISTS', 'INVALID_PAGE'].includes(code);
    return res.status(code === 'SUPERADMIN_REQUIRED' ? 403 : ['STORE_PROFILE_CONFLICT', 'STORE_CODE_EXISTS'].includes(code) ? 409 : known ? 400 : 503).json({ error: known ? code : 'STORES_UNAVAILABLE' });
  }
};
