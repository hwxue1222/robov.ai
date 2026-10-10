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
    if (!['activity', 'members'].includes(view)) return res.status(400).json({ error: 'INVALID_FILTER' });
    const {pagination,pageMeta}=require('../../lib/robov/pagination');const input=pagination(req.url);
    let rows,meta;
    if (view === 'members') {
      const search = (params.get('q') || '').trim();
      if (search.length > 100) return res.status(400).json({ error: 'INVALID_FILTER' });
      const where={createdAt:{lte:input.asOf},member:{isNot:null},...(search?{OR:[{email:{contains:search,mode:'insensitive'}},{displayName:{contains:search,mode:'insensitive'}}]}:{})};
      meta=pageMeta(input,await db.robovUser.count({where}));
      rows = await db.robovUser.findMany({ take:meta.pageSize,skip:(meta.page-1)*meta.pageSize,orderBy:[{createdAt:'desc'},{id:'desc'}],where, select: { id: true, email: true, displayName: true, createdAt: true, member: { select: { pointBalance: true, pointsOnHold: true } } } });
    } else {
      const memberId = params.get('memberId'), storeId = params.get('storeId');
      if ([memberId, storeId].some(value => value && value.length > 100)) return res.status(400).json({ error: 'INVALID_FILTER' });
      const where={createdAt:{lte:input.asOf},memberUserId:memberId||{not:null},...(storeId?{storeId}:{})};
      meta=pageMeta(input,await db.auditLog.count({where}));
      rows = await db.auditLog.findMany({take:meta.pageSize,skip:(meta.page-1)*meta.pageSize,orderBy:[{createdAt:'desc'},{id:'desc'}],where, select: { id: true, memberUserId: true, storeId: true, action: true, targetType: true, targetId: true, createdAt: true } });
      const ids = [...new Set(rows.map(row => row.memberUserId))];
      const members = await db.robovUser.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true, email: true } });
      const lookup = new Map(members.map(member => [member.id, member]));
      rows = rows.map(row => ({ ...row, member: lookup.get(row.memberUserId) || null }));
    }
    await db.auditLog.create({ data: { actorUserId: actor.id, action: 'MEMBER_ACTIVITY_VIEWED', targetType: view === 'members' ? 'MemberDirectory' : 'MemberActivity', metadata: { view, memberId: params.get('memberId'), storeId: params.get('storeId') } } });
    return res.status(200).json({ rows,pagination:meta });
  } catch(error) { return res.status(error.message==='INVALID_PAGE'?400:503).json({ error:error.message==='INVALID_PAGE'?'INVALID_PAGE':'ACTIVITY_UNAVAILABLE' }); }
};
