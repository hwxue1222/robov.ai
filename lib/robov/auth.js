const { getPrisma } = require('./prisma');
let instance;

function authBaseUrl() {
  return process.env.ROBOV_AUTH_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:4173');
}

async function getAuth() {
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) throw new Error('AUTH_NOT_CONFIGURED');
  if (!instance) instance = (async () => {
    const { betterAuth } = await import('better-auth');
    const { prismaAdapter } = await import('better-auth/adapters/prisma');
    const { APIError } = await import('better-auth/api');
    const db = getPrisma();
    return betterAuth({
      database: prismaAdapter(db, { provider: 'postgresql', transaction: true }),
      secret: process.env.BETTER_AUTH_SECRET, baseURL: authBaseUrl(),
      trustedOrigins: [authBaseUrl(), ...(process.env.VERCEL_BRANCH_URL ? [`https://${process.env.VERCEL_BRANCH_URL}`] : [])],
      user: { modelName: 'AuthUser', additionalFields: { invitationCodeId: { type: 'string', required: false, input: true }, employeeStoreId: { type: 'string', required: false, input: true }, employeeRole: { type: 'string', required: false, input: true }, employeeStoreIds: { type: 'string', required: false, input: true } } },
      session: { modelName: 'AuthSession', expiresIn: 60 * 60 * 8, updateAge: 60 * 60 },
      account: { modelName: 'AuthAccount', accountLinking: { enabled: false } },
      verification: { modelName: 'AuthVerification' },
      rateLimit: { enabled: true, storage: 'database', modelName: 'AuthRateLimit', window: 60, max: 50 },
      emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
      databaseHooks: { session: { create: {
        before: async session => ({ data: { ...session, expiresAt: new Date(Math.min(new Date(session.expiresAt).getTime(), Date.now() + 8 * 60 * 60 * 1000)) } })
      } }, user: { create: {
        before: async user => {
          const old = await db.robovUser.findUnique({ where: { email: user.email.toLowerCase() } });
          if (old) throw new APIError('BAD_REQUEST', { message: 'EMAIL_RESERVED' });
          if (user.employeeStoreId) {
            const store = await db.store.findUnique({ where: { id: user.employeeStoreId } });
            if (!store?.active) throw new APIError('BAD_REQUEST', { message: 'STAFF_FORBIDDEN', code: 'STAFF_FORBIDDEN' });
            const ids = user.employeeStoreIds ? JSON.parse(user.employeeStoreIds) : [user.employeeStoreId];
            if (!Array.isArray(ids) || !ids.includes(user.employeeStoreId) || !['STAFF','ADMIN'].includes(user.employeeRole || 'STAFF') || (user.employeeRole !== 'ADMIN' && ids.length !== 1) || await db.store.count({ where: { id: { in: ids }, active: true } }) !== ids.length) throw new APIError('BAD_REQUEST', { message: 'STAFF_FORBIDDEN', code: 'STAFF_FORBIDDEN' });
          }
          if (user.invitationCodeId) {
            const code = await db.invitationCode.findUnique({ where: { id: user.invitationCodeId }, include: { store: { select: { active: true } } } });
            if (!code?.enabled || !code.store.active) throw new APIError('BAD_REQUEST', { message: 'INVALID_INVITATION_CODE', code: 'INVALID_INVITATION_CODE' });
          }
        }
      } } }
    });
  })();
  return instance;
}

function requestHeaders(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) if (typeof value === 'string') headers.set(key, value);
  return headers;
}

async function ensureRobovUser(user) {
  const stored = await getPrisma().authUser.findUnique({ where: { id: user.id }, select: { invitationCodeId: true, employeeStoreId: true, employeeRole: true, employeeStoreIds: true } });
  if (stored?.employeeStoreId) return require('./staff-accounts').createEmployee(getPrisma(), user, stored.employeeStoreId, { role: stored.employeeRole || 'STAFF', storeIds: stored.employeeStoreIds ? JSON.parse(stored.employeeStoreIds) : [stored.employeeStoreId] });
  return require('./signup-reward').createMember(getPrisma(), { ...user, invitationCodeId: stored?.invitationCodeId });
}

async function actorForAuthUser(authUserId) {
  const db = getPrisma();
  const user = await db.robovUser.findUnique({ where: { authUserId }, include: { staffStores: { where: { active: true, role: { in: ['STAFF', 'MANAGER', 'ADMIN'] }, store: { active: true } }, include: { store: true } } } });
  if (!user) return null;
  const stores = user.role === 'SUPERADMIN' ? await db.store.findMany({ where: { active: true }, orderBy: { name: 'asc' } }) : user.staffStores.map(staff => staff.store).filter(store => require('./staff-accounts').fixedStaffStore(user, store.id));
  return { id: user.id, email: user.email, displayName: user.displayName, username: user.username, role: user.role, createdAt: user.createdAt, isEmployee: user.role === 'SUPERADMIN' || stores.length > 0, stores: stores.map(store => ({ id: store.id, name: store.name })) };
}

async function requireActor(req, res, staff = false) {
  const session = await tabSession(req);
  const actor = session?.user ? await actorForAuthUser(session.user.id) : null;
  if (!actor) { res.status(401).json({ error: 'LOGIN_REQUIRED' }); return null; }
  if (staff && !actor.isEmployee) { res.status(403).json({ error: 'STAFF_FORBIDDEN' }); return null; }
  if (req.method !== 'GET') {
    const origin = req.headers?.origin;
    const allowed = [authBaseUrl(), ...(process.env.VERCEL_BRANCH_URL ? [`https://${process.env.VERCEL_BRANCH_URL}`] : [])];
    if ((origin && !allowed.includes(origin)) || req.headers?.['sec-fetch-site'] === 'cross-site') { res.status(403).json({ error: 'ORIGIN_FORBIDDEN' }); return null; }
  }
  return actor;
}

async function tabSession(req) {
  const proof = req.headers?.['x-robov-tab-proof'];
  if (typeof proof !== 'string' || proof.length !== 43) return null;
  const session = await (await getAuth()).api.getSession({headers:requestHeaders(req)});
  return session?.session && require('./tab-session').validTabProof(session.session.id,proof) ? session : null;
}

module.exports = { getAuth, authBaseUrl, requestHeaders, ensureRobovUser, actorForAuthUser, requireActor, tabSession };
