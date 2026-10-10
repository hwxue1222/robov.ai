const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { getPrisma } = require('../lib/robov/prisma');
const { ensureRobovUser } = require('../lib/robov/auth');
const { requestRedemption, confirmRedemption, getWalletSummary } = require('../lib/robov/ledger');
const proofs=new Map();
async function call(route, method, body, cookie) {
  const headers = { origin: 'http://localhost:4173', 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1', ...(cookie ? { cookie,'x-robov-tab-proof':proofs.get(cookie) } : {}) };
  const req = { method, body, headers };
  const res = { code: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; } };
  await require('../api/robov/' + route)(req, res);
  if(res.data?.tabProof&&res.headers['set-cookie'])proofs.set(res.headers['set-cookie'].map(value=>value.split(';')[0]).join('; '),res.data.tabProof);
  return res;
}
(async () => {
  const host = new URL(process.env.DATABASE_URL).hostname.replace('-pooler', '');
  if (process.env.VERCEL_ENV === 'production' || host !== process.env.ROBOV_TEST_DATABASE_HOST) throw new Error('EXPLICIT_TEST_DATABASE_REQUIRED');
  process.env.ROBOV_AUTH_BASE_URL = 'http://localhost:4173';
  const db = getPrisma();
  const run = crypto.randomUUID();
  try {
    const email = `auth-${run}@example.invalid`, password = crypto.randomBytes(20).toString('hex');
    const registered = await call('session', 'POST', { action: 'register', mode: 'member', email, password, role: 'ADMIN', displayName: 'Integration Member' });
    assert.equal(registered.code, 201, JSON.stringify(registered.data));
    const user = registered.data.user;
    assert.equal(user.role, 'MEMBER');
    const cookie = registered.headers['set-cookie'].map(value => value.split(';')[0]).join('; ');
    assert(registered.headers['set-cookie'].filter(value=>value.includes('session_token=')).every(value=>!/(max-age|expires)=/i.test(value)));
    assert(cookie);
    const authUser = await db.authUser.findUnique({ where: { email } });
    await Promise.all([ensureRobovUser(authUser), ensureRobovUser(authUser), ensureRobovUser(authUser)]);
    assert.equal((await getWalletSummary(db, user.id)).pointBalance, 100);
    assert.equal(await db.pointTransaction.count({ where: { idempotencyKey: `signup:${authUser.id}` } }), 1);
    assert.equal((await call('member', 'GET', null)).code, 401);
    assert.equal((await call('member', 'GET', null, cookie)).code, 200);
    assert.equal((await call('settings', 'GET', null, cookie)).code, 403);
    assert.equal((await call('session', 'POST', { action: 'login', mode: 'employee', identifier: email, password })).code, 403);
    const store = await db.store.findUnique({ where: { slug: 'puteri-harbour' } });
    const admin = await db.robovUser.findUnique({ where: { username: 'admin' } });
    const voucher = { actorUserId: admin.id, storeId: store.id, memberUserId: user.id, points: 5, amount: 50, receiptNo: `V-${run}`, dineIn: true, otherPromotion: false, idempotencyKey: `voucher-${run}` };
    await assert.rejects(requestRedemption(db, { ...voucher, amount: 49 }), /没有满足最低消费金额/);
    await assert.rejects(requestRedemption(db, { ...voucher, dineIn: false }), /VOUCHER_TERMS_NOT_MET/);
    await assert.rejects(requestRedemption(db, { ...voucher, otherPromotion: true }), /VOUCHER_TERMS_NOT_MET/);
    const hold = await requestRedemption(db, voucher);
    assert.equal(hold.transaction.metadata.discountCents, 500);
    await Promise.all([1, 2, 3].map(() => confirmRedemption(db, { transactionId: hold.transaction.id, memberUserId: user.id, idempotencyKey: 'confirm' })));
    assert.equal((await getWalletSummary(db, user.id)).pointBalance, 95);
    assert.equal((await getWalletSummary(db, user.id)).pointsOnHold, 0);
    assert.equal(await db.auditLog.count({ where: { targetId: hold.transaction.id, action: 'REDEMPTION_CONFIRMED' } }), 1);
    assert.equal((await call('session', 'POST', { action: 'logout' }, cookie)).code, 200);
    assert.equal((await call('member', 'GET', null, cookie)).code, 401);
    console.log('PASS: password signup, cookie session, member role, once-only 100 points, staff/admin denial, voucher terms, concurrent confirmation, logout.');
  } finally { await db.$disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
