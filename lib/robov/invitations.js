const { rewardForAmount } = require('./earn-policy');
function normalizeCode(value) {
  if (typeof value !== 'string') throw new Error('INVALID_INVITATION_CODE');
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) throw new Error('INVALID_INVITATION_CODE');
  return code;
}
function validateInvitation(input) {
  const code = normalizeCode(input.code);
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 100 || !Number.isInteger(input.rateBps) || input.rateBps < 0 || input.rateBps > 10000 ||
    typeof input.enabled !== 'boolean' || typeof input.rewardEnabled !== 'boolean') throw new Error('INVALID_INVITATION_SETTINGS');
  return { code, name, rateBps: input.rateBps, enabled: input.enabled, rewardEnabled: input.rewardEnabled };
}
async function registrationInvitation(db, value) {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) return null;
  const row = await db.invitationCode.findUnique({ where: { code: normalizeCode(value) }, include: { store: { select: { active: true } } } });
  if (!row?.enabled || !row.store.active) throw new Error('INVALID_INVITATION_CODE');
  return row;
}
function invitationReward(amountCents, policy, invitation, storeId) {
  const base = rewardForAmount(amountCents, policy);
  if (!invitation?.rewardEnabled || invitation.store?.active === false) return { ...base, rateSource: 'STORE' };
  return { ...base, points: Math.floor(amountCents * invitation.rateBps / 1000000), rateBps: invitation.rateBps, tierId: null,
    rateSource: 'INVITATION', invitationCodeId: invitation.id, invitationCode: invitation.code, invitationVersion: invitation.version };
}
async function memberReward(db, memberUserId, storeId, amountCents, policy) {
  const user = await db.robovUser.findUnique({ where: { id: memberUserId }, include: { invitationCode: { include: { store: { select: { active: true } } } } } });
  if (!user) throw new Error('INVALID_MEMBER');
  return invitationReward(amountCents, policy, user.invitationCode, storeId);
}
module.exports = { normalizeCode, validateInvitation, registrationInvitation, invitationReward, memberReward };
