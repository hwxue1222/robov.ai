const crypto = require('node:crypto');
function tabProof(sessionId) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('AUTH_NOT_CONFIGURED');
  return crypto.createHmac('sha256',secret).update(`robov-tab:${sessionId}`).digest('base64url');
}
function validTabProof(sessionId, proof) {
  if (typeof proof !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(proof)) return false;
  return crypto.timingSafeEqual(Buffer.from(tabProof(sessionId)),Buffer.from(proof));
}
module.exports = { tabProof,validTabProof };
