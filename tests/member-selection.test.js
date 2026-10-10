const test = require('node:test');
const assert = require('node:assert/strict');
const { selectMember, selectedMember, clearMember } = require('../lib/robov/member-selection');
function database() {
  let row;
  return { memberSelection: {
    async upsert({ create, update }) { row = row ? { ...row, ...update } : create; },
    async findUnique({ where }) { return row?.tokenHash === where.tokenHash ? row : null; },
    async deleteMany({ where }) { if (row?.actorUserId === where.actorUserId && row?.proofHash === where.proofHash) row = null; }
  } };
}
const input = { actorUserId: 'staff', proof: 'a'.repeat(43), storeId: 'store', memberUserId: 'member-one' };
test('member selection outlives QR expiry but is bound to employee, store and login tab', async () => {
  const db = database();
  const token = await selectMember(db, input, 1000);
  assert.equal(await selectedMember(db, { ...input, token }, 62000), 'member-one');
  for (const changed of [{ actorUserId: 'other' }, { storeId: 'other' }, { proof: 'b'.repeat(43) }, { token: 'x'.repeat(43) }, { token: undefined }]) {
    await assert.rejects(selectedMember(db, { ...input, token, ...changed }, 62000), /MEMBER_NOT_SELECTED/);
  }
  await assert.rejects(selectedMember(db, { ...input, token }, 1000 + 8 * 60 * 60 * 1000), /MEMBER_NOT_SELECTED/);
});
test('exit revokes the selection and identifying another member replaces the old selection', async () => {
  const db = database();
  const old = await selectMember(db, input);
  const next = await selectMember(db, { ...input, memberUserId: 'member-two' });
  await assert.rejects(selectedMember(db, { ...input, token: old }), /MEMBER_NOT_SELECTED/);
  assert.equal(await selectedMember(db, { ...input, token: next }), 'member-two');
  await clearMember(db, { ...input, proof: 'b'.repeat(43) });
  assert.equal(await selectedMember(db, { ...input, token: next }), 'member-two');
  await clearMember(db, input);
  await assert.rejects(selectedMember(db, { ...input, token: next }), /MEMBER_NOT_SELECTED/);
});
