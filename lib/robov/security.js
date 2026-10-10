const crypto = require('node:crypto');

const QR_TTL_SECONDS = 60;

function getSecret() {
  const secret = process.env.ROBOV_QR_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error('ROBOV_QR_SECRET_NOT_CONFIGURED');
  return secret;
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signPayload(payload, secret = getSecret()) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function issueMemberQrToken(memberUserId, now = Date.now()) {
  if (!memberUserId || typeof memberUserId !== 'string') throw new Error('INVALID_MEMBER');
  const exp = Math.floor(now / 1000) + QR_TTL_SECONDS;
  const nonce = crypto.randomBytes(12).toString('base64url');
  const body = base64url(JSON.stringify({ sub: memberUserId, typ: 'robov-member-qr', exp, nonce }));
  return `${body}.${signPayload(body)}`;
}

function verifyMemberQrToken(token, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 1024 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new Error('INVALID_QR_TOKEN');
  const [body, signature] = token.split('.');
  const expected = signPayload(body);
  const actual = Buffer.from(signature || '');
  const valid = actual.length === Buffer.byteLength(expected) && crypto.timingSafeEqual(actual, Buffer.from(expected));
  if (!valid) throw new Error('INVALID_QR_SIGNATURE');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.typ !== 'robov-member-qr' || typeof payload.sub !== 'string' || !Number.isInteger(payload.exp)) throw new Error('INVALID_QR_PAYLOAD');
  if (payload.exp <= Math.floor(now / 1000)) throw new Error('QR_EXPIRED');
  return { memberUserId: payload.sub, expiresAt: new Date(payload.exp * 1000).toISOString() };
}

function readActor(req) {
  return {
    userId: req.headers['x-robov-user-id'],
    role: req.headers['x-robov-role'],
    storeId: req.headers['x-robov-store-id']
  };
}

module.exports = { QR_TTL_SECONDS, issueMemberQrToken, verifyMemberQrToken, readActor };
