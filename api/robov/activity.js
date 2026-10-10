const { getPrisma } = require('../../lib/robov/prisma');
const { requireActor } = require('../../lib/robov/auth');
const { requireTestMode } = require('../../lib/robov/config');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireTestMode(res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const actor = await requireActor(req, res, true);
    if (!actor) return;
    if (actor.role !== 'SUPERADMIN') return res.status(403).json({ error: 'SUPERADMIN_REQUIRED' });
    const db = getPrisma();
    const params = new URL(req.url || '/api/robov/activity', 'http://localhost').searchParams;
    const view = params.get('view') || 'activity';
    const cursor = params.get('cursor');
    if (!['activity', 'members'].includes(view) || (cursor && cursor.length > 100)) return res.status(400).json({ error: 'INVALID_FILTER' });
    const paging = { take: 31, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) };
    let rows;
    if (view === 'members') {
      const search = (params.get('q') || '').trim();
      if (search.length > 100) return res.status(400).json({ error: 'INVALID_FILTER' });
      rows = await db.robovUser.findMany({ ...paging, where: { member: { isNot: null }, ...(search ? { OR: [{ email: { contains: search, mode: 'insensitive' } }, { displayName: { contains: search, mode: 'insensitive' } }] } : {}) }, select: { id: true, email: true, displayName: true, createdAt: true, member: { select: { pointBalance: true, pointsOnHold: true } } } });
    } else {
      const memberId = params.get('memberId'), storeId = params.get('storeId');
      if ([memberId, storeId].some(value => value && value.length > 100)) return res.status(400).json({ error: 'INVALID_FILTER' });
      rows = await db.auditLog.findMany({ ...paging, where: { memberUserId: memberId || { not: null }, ...(storeId ? { storeId } : {}) }, select: { id: true, memberUserId: true, storeId: true, action: true, targetType: true, targetId: true, createdAt: true } });
      const ids = [...new Set(rows.map(row => row.memberUserId))];
      const members = await db.robovUser.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true, email: true } });
      const lookup = new Map(members.map(member => [member.id, member]));
      rows = rows.map(row => ({ ...row, member: lookup.get(row.memberUserId) || null }));
    }
    await db.auditLog.create({ data: { actorUserId: actor.id, action: 'MEMBER_ACTIVITY_VIEWED', targetType: view === 'members' ? 'MemberDirectory' : 'MemberActivity', metadata: { view, memberId: params.get('memberId'), storeId: params.get('storeId') } } });
    return res.status(200).json({ rows: rows.slice(0, 30), nextCursor: rows.length > 30 ? rows[29].id : null });
  } catch { return res.status(503).json({ error: 'ACTIVITY_UNAVAILABLE' }); }
};
