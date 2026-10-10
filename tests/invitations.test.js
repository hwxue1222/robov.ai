const test = require('node:test'), assert = require('node:assert/strict');
const { normalizeCode, validateInvitation, registrationInvitation, invitationReward } = require('../lib/robov/invitations');
const policy = { enabled: true, baseRateBps: 300, tiers: [{ id: 'tier', minCents: 10000, maxCents: null, rateBps: 800 }], version: 2 };
const code = { id: 'invite', code: 'JWD_TEST', rateBps: 500, enabled: true, rewardEnabled: true, version: 3, storeId: 'owner', store: { active: true } };
test('invitation codes normalize consistently and validate bounded rates and settings', () => {
  assert.equal(normalizeCode(' jwd_test '), 'JWD_TEST');
  for (const invalid of ['a', '含邀请码', 'a b c', 'x'.repeat(33), {}, null]) assert.throws(() => normalizeCode(invalid), /INVALID_INVITATION_CODE/);
  const valid = { code: 'TEST', name: 'Campaign', rateBps: 500, enabled: true, rewardEnabled: true };
  assert.equal(validateInvitation(valid).rateBps, 500);
  for (const patch of [{ rateBps: -1 }, { rateBps: 10001 }, { rateBps: 500.5 }, { name: '' }, { enabled: 'true' }]) assert.throws(() => validateInvitation({ ...valid, ...patch }), /INVALID_INVITATION_SETTINGS/);
});
test('optional registration rejects unknown, disabled and inactive-store invitation codes', async () => {
  assert.equal(await registrationInvitation({}, ''), null);
  assert.equal(await registrationInvitation({}, undefined), null);
  const db = row => ({ invitationCode: { findUnique: async () => row } });
  assert.equal((await registrationInvitation(db(code), 'jwd_test')).id, 'invite');
  for (const row of [null, { ...code, enabled: false }, { ...code, store: { active: false } }]) await assert.rejects(registrationInvitation(db(row), 'TEST'), /INVALID_INVITATION_CODE/);
});
test('invited members use invitation rate at every store ahead of tiers; ordinary members retain store policy', () => {
  assert.equal(invitationReward(10000, policy, code, 'another-store').points, 5);
  const reward = invitationReward(10000, policy, code, 'another-store');
  assert.equal(reward.tierId, null); assert.equal(reward.invitationCodeId, code.id); assert.equal(reward.invitationVersion, 3);
  assert.equal(invitationReward(5000, policy, null, 'another-store').rateBps, 300);
  assert.equal(invitationReward(10000, policy, null, 'another-store').rateBps, 800);
  assert.equal(invitationReward(9999, policy, code, 'another-store').points, 4);
  assert.equal(invitationReward(10000, policy, { ...code, enabled: false }, 'another-store').points, 5);
  assert.equal(invitationReward(10000, policy, { ...code, rewardEnabled: false }, 'another-store').rateBps, 800);
  assert.throws(() => invitationReward(10000, { ...policy, enabled: false }, code, 'another-store'), /EARN_REWARDS_DISABLED/);
});
