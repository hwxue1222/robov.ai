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
      user: { modelName: 'AuthUser' },
      session: { modelName: 'AuthSession', expiresIn: 60 * 60 * 8, updateAge: 60 * 60 },
      account: { modelName: 'AuthAccount', accountLinking: { enabled: false } },
      verification: { modelName: 'AuthVerification' },
      rateLimit: { enabled: true, storage: 'database', modelName: 'AuthRateLimit', window: 60, max: 50 },
      emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
      databaseHooks: { user: { create: {
        before: async user => {
          const old = await db.robovUser.findUnique({ where: { email: user.email.toLowerCase() } });
          if (old) throw new APIError('BAD_REQUEST', { message: 'EMAIL_RESERVED' });
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
  return require('./signup-reward').createMember(getPrisma(), user);
}

async function actorForAuthUser(authUserId) {
  const db = getPrisma();
  const user = await db.robovUser.findUnique({ where: { authUserId }, include: { staffStores: { where: { active: true, role: { in: ['STAFF', 'MANAGER', 'ADMIN'] }, store: { active: true } }, include: { store: true } } } });
  if (!user) return null;
  const stores = user.role === 'SUPERADMIN' ? await db.store.findMany({ where: { active: true }, orderBy: { name: 'asc' } }) : user.staffStores.map(staff => staff.store);
  return { id: user.id, email: user.email, displayName: user.displayName, username: user.username, role: user.role, isEmployee: user.role === 'SUPERADMIN' || stores.length > 0, stores: stores.map(store => ({ id: store.id, name: store.name })) };
}

async function requireActor(req, res, staff = false) {
  const session = await (await getAuth()).api.getSession({ headers: requestHeaders(req) });
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

module.exports = { getAuth, authBaseUrl, requestHeaders, ensureRobovUser, actorForAuthUser, requireActor };
