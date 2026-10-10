const test = require('node:test'), assert = require('node:assert/strict');
const { releaseStoreHolds } = require('../lib/robov/store-status');
const { earnPoints, requestRedemption, awardActivity, confirmRedemption } = require('../lib/robov/ledger');
const { setStoreActive, validateProfile } = require('../lib/robov/store-profiles');
test('store disabling releases pending holds without changing balances and clears selections', async () => {
  const wallet = { pointBalance: 10, pointsOnHold: 5 }, audits = [];
  let cleared = false, pending = true;
  const tx = {
    pointTransaction: { findMany: async () => [{ id: 'hold', walletId: 'wallet', points: -5, wallet: { userId: 'member' } }], updateMany: async () => { const count = pending ? 1 : 0; pending = false; return { count }; } },
    memberWallet: { update: async ({ data }) => { assert.equal(data.pointBalance, undefined); wallet.pointsOnHold -= data.pointsOnHold.decrement; } },
    auditLog: { create: async ({ data }) => audits.push(data) }, memberSelection: { deleteMany: async ({ where }) => { assert.equal(where.storeId, 'store'); cleared = true; } }
  };
  await releaseStoreHolds(tx, { id: 'actor' }, 'store');
  await releaseStoreHolds(tx, { id: 'actor' }, 'store');
  assert.equal(wallet.pointBalance, 10); assert.equal(wallet.pointsOnHold, 0); assert.equal(audits.length, 1); assert(cleared);
  assert.equal(audits[0].metadata.reason, 'STORE_DISABLED');
});
test('inactive stores reject credits, redemption requests, interaction awards and member confirmations', async () => {
  let locks = 0;
  const tx = { $queryRaw: async () => { locks++; }, store: { findUnique: async () => ({ active: false }) }, pointTransaction: { findUnique: async () => ({ id: 'hold', storeId: 'store', type: 'REDEEM_HOLD', status: 'PENDING_MEMBER_CONFIRMATION', wallet: { userId: 'member' } }) } };
  const db = { $transaction: fn => fn(tx) }, input = { memberUserId: 'member', storeId: 'store', actorUserId: 'actor', amount: 50, receiptNo: 'RCP-123', points: 5, dineIn: true, otherPromotion: false, transactionId: 'hold' };
  for (const fn of [earnPoints, requestRedemption, awardActivity]) await assert.rejects(fn(db, input), /STAFF_FORBIDDEN/);
  await assert.rejects(confirmRedemption(db, input), /REDEMPTION_NOT_PENDING/); assert.equal(locks, 4);
});
test('only superadmin can toggle stores and generated numbers cannot be supplied in profile writes', async () => {
  await assert.rejects(setStoreActive({}, { role: 'ADMIN' }, { id: 'store', version: 1, active: false }), /SUPERADMIN_REQUIRED/);
  const data = validateProfile({ name: 'JWD', slug: 'jwd', active: true, number: 99 }, 'store');
  assert.equal(data.number, undefined);
});
