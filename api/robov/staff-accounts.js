const { requireActor, getAuth, authBaseUrl, requestHeaders, ensureRobovUser } = require('../../lib/robov/auth');
const { requireTestMode } = require('../../lib/robov/config');
const { getPrisma } = require('../../lib/robov/prisma');
const { managedStores } = require('../../lib/robov/store-admin');
const { pagination, pageMeta } = require('../../lib/robov/pagination');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); if (!requireTestMode(res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const actor = await requireActor(req, res, true); if (!actor) return;
    const db = getPrisma(), stores = await managedStores(db, actor);
    if (!stores.length) return res.status(403).json({ error: 'ADMIN_REQUIRED' });
    const params = new URL(req.url, 'https://robov.ai').searchParams;
    const storeId = req.method === 'GET' ? params.get('storeId') : req.body?.storeId;
    if (storeId && !stores.some(store => store.id === storeId)) return res.status(403).json({ error: 'STAFF_FORBIDDEN' });
    if (req.method === 'GET') {
      const input = pagination(req.url), where = { role: 'STAFF', authUserId: { not: null }, staffStoreId: storeId || { in: stores.map(store => store.id) }, createdAt: { lte: input.asOf } };
      const meta = pageMeta(input, await db.robovUser.count({ where }));
      const rows = await db.robovUser.findMany({ where, take: meta.pageSize, skip: (meta.page - 1) * meta.pageSize, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, displayName: true, email: true, staffStoreId: true, staffStore: { select: { name: true } }, staffStores: { select: { storeId: true, active: true } }, createdAt: true } });
      return res.status(200).json({ rows: rows.map(row => ({ ...row, active: row.staffStores.some(link => link.storeId === row.staffStoreId && link.active) })), stores, pagination: meta });
    }
    const { id, email, displayName, password, active } = req.body || {};
    if (id && (typeof id !== 'string' || id.length > 100)) return res.status(400).json({ error: 'INVALID_STAFF_ACCOUNT' });
    if (!storeId || typeof displayName !== 'string' || !displayName.trim() || displayName.length > 100 || typeof active !== 'boolean') return res.status(400).json({ error: 'INVALID_STAFF_ACCOUNT' });
    if (!id) {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof password !== 'string' || password.length < 12 || password.length > 128) return res.status(400).json({ error: 'INVALID_STAFF_ACCOUNT' });
      const headers = requestHeaders(req); headers.delete('cookie'); headers.set('Content-Type', 'application/json');
      const response = await (await getAuth()).handler(new Request(new URL('/api/auth/sign-up/email', authBaseUrl()), { method: 'POST', headers, body: JSON.stringify({ email: email.trim().toLowerCase(), name: displayName.trim(), password, employeeStoreId: storeId, rememberMe: false }) }));
      const result = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: result.code || 'STAFF_ACCOUNT_EXISTS' });
      const user = await ensureRobovUser(result.user);
      if (result.token) await db.authSession.deleteMany({ where: { token: result.token } });
      if (!active) await db.storeStaff.updateMany({ where: { userId: user.id }, data: { active: false } });
      await db.auditLog.create({ data: { actorUserId: actor.id, storeId, action: 'REWARD_SETTINGS_UPDATED', targetType: 'StaffAccount', targetId: user.id, metadata: { action: 'created', email: user.email } } });
      return res.status(201).json({ staff: { id: user.id, email: user.email, staffStoreId: user.staffStoreId } });
    }
    const staff = await db.$transaction(async tx => {
      const before = await tx.robovUser.findUnique({ where: { id } });
      if (!before || before.role !== 'STAFF' || !before.authUserId || !stores.some(store => store.id === before.staffStoreId)) throw new Error('STAFF_FORBIDDEN');
      const claim = await tx.robovUser.updateMany({ where: { id, role: 'STAFF', staffStoreId: before.staffStoreId, updatedAt: before.updatedAt }, data: { staffStoreId: storeId, displayName: displayName.trim() } });
      if (claim.count !== 1) throw new Error('STAFF_ACCOUNT_CONFLICT');
      await tx.storeStaff.updateMany({ where: { userId: id }, data: { active: false } });
      await tx.storeStaff.upsert({ where: { storeId_userId: { storeId, userId: id } }, create: { storeId, userId: id, role: 'STAFF', active }, update: { role: 'STAFF', active } });
      await tx.authUser.update({ where: { id: before.authUserId }, data: { name: displayName.trim(), employeeStoreId: storeId } });
      await tx.authSession.deleteMany({ where: { userId: before.authUserId } });
      await tx.memberSelection.deleteMany({ where: { actorUserId: id } });
      await tx.auditLog.create({ data: { actorUserId: actor.id, storeId, action: 'REWARD_SETTINGS_UPDATED', targetType: 'StaffAccount', targetId: id, metadata: { action: 'updated', previousStoreId: before.staffStoreId, active } } });
      return { id, staffStoreId: storeId, active };
    });
    return res.status(200).json({ staff });
  } catch (error) { const code = ['STAFF_FORBIDDEN', 'STAFF_ACCOUNT_CONFLICT', 'INVALID_PAGE'].includes(error.message) ? error.message : 'STAFF_ACCOUNTS_UNAVAILABLE'; return res.status(code === 'STAFF_FORBIDDEN' ? 403 : code === 'STAFF_ACCOUNT_CONFLICT' ? 409 : code === 'INVALID_PAGE' ? 400 : 503).json({ error: code }); }
};
