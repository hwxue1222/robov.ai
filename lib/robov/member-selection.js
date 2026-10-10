const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function binding(actorUserId, proof) {
  if (!actorUserId || typeof proof !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(proof)) throw new Error('MEMBER_NOT_SELECTED');
  return { actorUserId, proofHash: hash(proof) };
}
async function selectMember(db, { actorUserId, proof, memberUserId, storeId }, now = Date.now()) {
  const bound = binding(actorUserId, proof);
  const token = crypto.randomBytes(32).toString('base64url');
  const data = { memberUserId, storeId, tokenHash: hash(token), expiresAt: new Date(now + 8 * 60 * 60 * 1000) };
  await db.memberSelection.deleteMany({ where: { expiresAt: { lte: new Date(now) } } });
  await db.memberSelection.upsert({ where: { actorUserId_proofHash: bound }, create: { ...bound, ...data }, update: data });
  return token;
}
async function selectedMember(db, { actorUserId, proof, storeId, token }, now = Date.now()) {
  const bound = binding(actorUserId, proof);
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('MEMBER_NOT_SELECTED');
  const row = await db.memberSelection.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.actorUserId !== bound.actorUserId || row.proofHash !== bound.proofHash || row.storeId !== storeId || row.expiresAt.getTime() <= now) throw new Error('MEMBER_NOT_SELECTED');
  return row.memberUserId;
}
async function clearMember(db, { actorUserId, proof }) {
  return db.memberSelection.deleteMany({ where: binding(actorUserId, proof) });
}
module.exports = { selectMember, selectedMember, clearMember };
