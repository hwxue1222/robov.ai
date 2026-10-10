const { getPrisma } = require('../../lib/robov/prisma');
const { requireTestMode } = require('../../lib/robov/config');
const { getAuth, authBaseUrl, requestHeaders, ensureRobovUser, actorForAuthUser, tabSession,requireActor } = require('../../lib/robov/auth');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireTestMode(res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const auth = await getAuth();
    const headers = requestHeaders(req);
    if (req.method === 'GET') {
      const session = await tabSession(req);
      return res.status(200).json({ user: session?.user ? await actorForAuthUser(session.user.id) : null });
    }
    const { action = 'login', mode = 'member', identifier, password, email, displayName } = req.body || {};
    if (action === 'close' || action === 'logout') {
      if (!await requireActor(req,res)) return;
      if (action === 'close') {
        const session = await tabSession(req);
        if (session) await getPrisma().authSession.deleteMany({where:{id:session.session.id}});
        return res.status(200).json({success:true});
      }
    }
    let path, body;
    if (action === 'logout') { path = 'sign-out'; body = {}; }
    else if (action === 'register') {
      if (mode !== 'member') return res.status(403).json({ error: 'STAFF_REGISTRATION_FORBIDDEN' });
      path = 'sign-up/email'; body = { email: typeof email === 'string' ? email.trim().toLowerCase() : '', password, name: displayName || 'ROBOV Member', rememberMe: false };
      try {
        const invitation = await require('../../lib/robov/invitations').registrationInvitation(getPrisma(), req.body?.invitationCode);
        if (invitation) body.invitationCodeId = invitation.id;
      } catch (error) {
        if (error.message === 'INVALID_INVITATION_CODE') return res.status(400).json({ error: error.message });
        throw error;
      }
    } else if (action === 'login') {
      const clean = typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
      if (!clean.includes('@') || typeof password !== 'string') return res.status(400).json({ error: 'INVALID_EMAIL' });
      path = 'sign-in/email'; body = { email: clean, password, rememberMe: false };
    } else return res.status(400).json({ error: 'UNKNOWN_ACTION' });
    headers.set('Content-Type', 'application/json');
    const response = await auth.handler(new Request(new URL('/api/auth/' + path, authBaseUrl()), { method: 'POST', headers, body: JSON.stringify(body) }));
    const result = await response.json();
    if (!response.ok) {
      if (response.headers.get('retry-after')) res.setHeader('Retry-After',response.headers.get('retry-after'));
      return res.status(response.status).json({ error: response.status === 429 ? 'TOO_MANY_REQUESTS' : result.code || 'LOGIN_FAILED' });
    }
    let actor = null,proof = null;
    if (result.user) {
      await ensureRobovUser(result.user);
      actor = await actorForAuthUser(result.user.id);
      if ((mode === 'employee' || actor?.role === 'STAFF') && !actor?.isEmployee) {
        if (result.token) await getPrisma().authSession.deleteMany({ where: { token: result.token } });
        return res.status(403).json({ error: 'STAFF_FORBIDDEN' });
      }
      await getPrisma().auditLog.create({ data: { actorUserId: actor.id, memberUserId: actor.id, action: 'MEMBER_LOGIN', targetType: 'RobovUser', targetId: actor.id } });
      const session = await getPrisma().authSession.findUnique({where:{token:result.token},select:{id:true}});
      if(!session) throw new Error('SESSION_NOT_CREATED');
      proof = require('../../lib/robov/tab-session').tabProof(session.id);
    }
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    return res.status(action === 'register' ? 201 : 200).json(action === 'logout' ? { success: true } : { user: actor,tabProof:proof });
  } catch {
    return res.status(503).json({ error: 'AUTH_UNAVAILABLE' });
  }
};
