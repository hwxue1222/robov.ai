const { requireActor } = require('../../lib/robov/auth');
const { requireTestMode } = require('../../lib/robov/config');
const { getPrisma } = require('../../lib/robov/prisma');
const { validateInvitation } = require('../../lib/robov/invitations');
const { pagination, pageMeta } = require('../../lib/robov/pagination');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireTestMode(res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const actor = await requireActor(req, res, true); if (!actor) return;
    const db = getPrisma();
    const stores = await require('../../lib/robov/store-admin').managedStores(db, actor);
    if (!stores.length) return res.status(403).json({ error: 'ADMIN_REQUIRED' });
    const params = new URL(req.url, 'https://robov.ai').searchParams;
    const storeId = req.method === 'GET' ? params.get('storeId') : req.body?.storeId;
    if (storeId && !stores.some(store => store.id === storeId)) return res.status(403).json({ error: 'STAFF_FORBIDDEN' });
    if (req.method === 'GET') {
      const input = pagination(req.url), id = params.get('id');
      if (id && id.length > 100) return res.status(400).json({ error: 'INVALID_INVITATION_SETTINGS' });
      if (id) {
        const invitation = await db.invitationCode.findUnique({ where: { id } });
        if (!invitation || !stores.some(store => store.id === invitation.storeId)) return res.status(403).json({ error: 'STAFF_FORBIDDEN' });
        const where = { invitationCodeId: id, createdAt: { lte: input.asOf } };
        const meta = pageMeta(input, await db.robovUser.count({ where }));
        const rows = await db.robovUser.findMany({ where, take: meta.pageSize, skip: (meta.page - 1) * meta.pageSize, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, displayName: true, email: true, createdAt: true } });
        await db.auditLog.create({ data: { actorUserId: actor.id, storeId: invitation.storeId, action: 'MEMBER_ACTIVITY_VIEWED', targetType: 'InvitationCode', targetId: id, metadata: { view: 'registrations' } } });
        return res.status(200).json({ rows, pagination: meta });
      }
      const scope = { storeId: storeId || { in: stores.map(store => store.id) } };
      const where = { ...scope, createdAt: { lte: input.asOf } };
      const meta = pageMeta(input, await db.invitationCode.count({ where }));
      const rows = await db.invitationCode.findMany({ where, take: meta.pageSize, skip: (meta.page - 1) * meta.pageSize, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { store: { select: { name: true } }, _count: { select: { members: true } } } });
      const registrations = await db.robovUser.count({ where: { invitationCode: { is: scope } } });
      const last7Days = await db.robovUser.count({ where: { invitationCode: { is: scope }, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } });
      return res.status(200).json({ rows, pagination: meta, stores, summary: { registrations, last7Days } });
    }
    if (!storeId) return res.status(400).json({ error: 'INVALID_INVITATION_SETTINGS' });
    const data = validateInvitation(req.body), id = req.body.id, version = req.body.version;
    if (id && (typeof id !== 'string' || id.length > 100)) return res.status(400).json({ error: 'INVALID_INVITATION_SETTINGS' });
    if (id && (!Number.isInteger(version) || version < 1)) return res.status(400).json({ error: 'INVITATION_CONFLICT' });
    const row = await db.$transaction(async tx => {
      const before = id ? await tx.invitationCode.findUnique({ where: { id } }) : null;
      if (id && (!before || before.storeId !== storeId)) throw new Error('STAFF_FORBIDDEN');
      if (id) {
        const changed = await tx.invitationCode.updateMany({ where: { id, storeId, version }, data: { ...data, version: { increment: 1 } } });
        if (changed.count !== 1) throw new Error('INVITATION_CONFLICT');
      }
      const result = id ? await tx.invitationCode.findUnique({ where: { id } }) : await tx.invitationCode.create({ data: { ...data, storeId } });
      await tx.auditLog.create({ data: { actorUserId: actor.id, storeId, action: 'REWARD_SETTINGS_UPDATED', targetType: 'InvitationCode', targetId: result.id, metadata: { before, after: result } } });
      return result;
    });
    return res.status(200).json({ invitation: row });
  } catch (error) {
    const code = error.code === 'P2002' ? 'INVITATION_CODE_EXISTS' : error.message;
    const validation = ['INVALID_INVITATION_CODE', 'INVALID_INVITATION_SETTINGS', 'INVALID_PAGE'].includes(code);
    return res.status(code === 'STAFF_FORBIDDEN' ? 403 : ['INVITATION_CONFLICT', 'INVITATION_CODE_EXISTS'].includes(code) ? 409 : validation ? 400 : 503).json({ error: validation || ['STAFF_FORBIDDEN', 'INVITATION_CONFLICT', 'INVITATION_CODE_EXISTS'].includes(code) ? code : 'INVITATIONS_UNAVAILABLE' });
  }
};
