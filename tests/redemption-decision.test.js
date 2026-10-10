const test = require('node:test'), assert = require('node:assert/strict');
const { cancelRedemption, confirmRedemption } = require('../lib/robov/ledger');
function fixture(status = 'PENDING_MEMBER_CONFIRMATION') {
  const wallet = { id: 'wallet', userId: 'member', pointBalance: 100, pointsOnHold: 100 };
  const hold = { id: 'hold', walletId: wallet.id, wallet, type: 'REDEEM_HOLD', points: -100, status };
  const tx = { pointTransaction: { findUnique: async () => hold, updateMany: async ({ where, data }) => { if (hold.status !== where.status) return { count: 0 }; Object.assign(hold, data); return { count: 1 }; } }, memberWallet: { update: async ({ data }) => { for (const [field, change] of Object.entries(data)) wallet[field] -= change.decrement; } }, auditLog: { create: async () => {} } };
  return { wallet, hold, db: { $transaction: fn => fn(tx) } };
}
test('decline preserves balance and releases a reservation once, and then cannot be confirmed', async () => {
  const { db, wallet } = fixture(); await cancelRedemption(db, { memberUserId: 'member', transactionId: 'hold' });
  assert.equal(wallet.pointBalance, 100); assert.equal(wallet.pointsOnHold, 0);
  await cancelRedemption(db, { memberUserId: 'member', transactionId: 'hold' }); assert.equal(wallet.pointsOnHold, 0);
  await assert.rejects(confirmRedemption(db, { memberUserId: 'member', transactionId: 'hold' }), /REDEMPTION_NOT_PENDING/);
});
test('only the wallet owner can decide and a posted redemption cannot be declined', async () => {
  const { db } = fixture(); await assert.rejects(cancelRedemption(db, { memberUserId: 'other', transactionId: 'hold' }), /MEMBER_FORBIDDEN/);
  const posted = fixture('POSTED'); await assert.rejects(cancelRedemption(posted.db, { memberUserId: 'member', transactionId: 'hold' }), /REDEMPTION_NOT_PENDING/);
});
