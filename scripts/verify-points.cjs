const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { earnPoints, requestRedemption, confirmRedemption, reverseRefund, getWalletSummary } = require('../lib/robov/ledger');

async function main() {
  const host = new URL(process.env.DATABASE_URL).hostname.replace('-pooler', '');
  if (process.env.VERCEL_ENV === 'production' || !process.env.ROBOV_TEST_DATABASE_HOST || host !== process.env.ROBOV_TEST_DATABASE_HOST) {
    throw new Error('EXPLICIT_TEST_DATABASE_REQUIRED');
  }
  const db = new PrismaClient();
  const run = crypto.randomUUID();
  try {
    const store = await db.store.upsert({ where: { slug: 'robov-test-store' }, update: {}, create: { name: 'ROBOV Test Store', slug: 'robov-test-store' } });
    const staff = await db.robovUser.upsert({ where: { email: 'robov-test-staff@example.invalid' }, update: {}, create: { email: 'robov-test-staff@example.invalid', displayName: 'Test Staff', role: 'STAFF' } });
    await db.storeStaff.upsert({ where: { storeId_userId: { storeId: store.id, userId: staff.id } }, update: {}, create: { storeId: store.id, userId: staff.id, role: 'STAFF' } });
    const member = await db.robovUser.create({ data: { email: `robov-test-${run}@example.invalid`, displayName: 'Test Member', member: { create: {} } } });
    const input = { actorUserId: staff.id, storeId: store.id, memberUserId: member.id, amount: '4000', receiptNo: `TEST-${run}`, idempotencyKey: `earn-${run}` };
    const earned = await earnPoints(db, input);
    assert.equal(earned.transaction.points, 120);
    assert.equal((await earnPoints(db, input)).idempotent, true);
    assert.equal((await getWalletSummary(db, member.id)).pointBalance, 120);
    await assert.rejects(earnPoints(db, { ...input, actorUserId: member.id, idempotencyKey: `denied-${run}` }), /STAFF_FORBIDDEN/);
    await assert.rejects(earnPoints(db, { ...input, idempotencyKey: `duplicate-${run}` }));
    assert.equal((await getWalletSummary(db, member.id)).pointBalance, 120);
    await earnPoints(db, { ...input, receiptNo: `SECOND-${run}`, idempotencyKey: `second-${run}` });
    const voucher = { ...input, points: 100, amount: 50, dineIn: true, otherPromotion: false, receiptNo: `VOUCHER-${run}` };
    const hold = await requestRedemption(db, { ...voucher, idempotencyKey: `hold-${run}` });
    assert.equal((await getWalletSummary(db, member.id)).pointsOnHold, 100);
    await assert.rejects(confirmRedemption(db, { memberUserId: staff.id, transactionId: hold.transaction.id, idempotencyKey: `wrong-${run}` }), /MEMBER_FORBIDDEN/);
    const confirm = { memberUserId: member.id, transactionId: hold.transaction.id, idempotencyKey: `confirm-${run}` };
    await confirmRedemption(db, confirm);
    assert.equal((await confirmRedemption(db, confirm)).idempotent, true);
    const refund = { actorUserId: staff.id, storeId: store.id, transactionId: earned.transaction.id, idempotencyKey: `refund-${run}` };
    await reverseRefund(db, refund);
    assert.equal((await reverseRefund(db, refund)).idempotent, true);
    const wallet = await getWalletSummary(db, member.id);
    assert.equal(wallet.pointBalance, 20);
    await assert.rejects(requestRedemption(db, { ...voucher, receiptNo: `LOW-${run}`, idempotencyKey: `insufficient-${run}` }), /INSUFFICIENT_POINTS/);
    assert.equal(wallet.pointsOnHold, 0);
    assert.equal(wallet.transactions.length, 4);
    assert.equal(await db.auditLog.count({ where: { memberUserId: member.id } }), 5);
    console.log(JSON.stringify({ status: 'passed', checks: ['earn', 'idempotency', 'unique receipt rollback', 'store role', 'insufficient balance', 'member confirmation', 'refund', 'audit'], storeId: store.id, staffId: staff.id, memberEmail: member.email, memberId: member.id, finalBalance: wallet.pointBalance }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => { console.error('Test database verification failed; credentials are omitted.'); process.exitCode = 1; });
