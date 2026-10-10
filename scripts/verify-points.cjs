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
    const staff = await db.robovUser.upsert({ where: { email: 'robov-test-staff@example.invalid' }, update: { staffStoreId: store.id }, create: { email: 'robov-test-staff@example.invalid', displayName: 'Test Staff', role: 'STAFF', staffStoreId: store.id } });
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
    const voucher = { ...input, points: 5, amount: 50, dineIn: true, otherPromotion: false, receiptNo: `VOUCHER-${run}` };
    for (const amount of [0.01,49,49.99]) await assert.rejects(requestRedemption(db,{...voucher,amount,idempotencyKey:`low-${run}-${amount}`}),/没有满足最低消费金额/);
    await assert.rejects(requestRedemption(db,{...voucher,points:100,idempotencyKey:`forged-${run}`}),/VOUCHER_REQUIRES_5_POINTS/);
    const hold = await requestRedemption(db, { ...voucher, idempotencyKey: `hold-${run}` });
    assert.equal((await getWalletSummary(db, member.id)).pointsOnHold, 5);
    assert.equal((await getWalletSummary(db, member.id)).pointBalance, 240);
    await assert.rejects(confirmRedemption(db, { memberUserId: staff.id, transactionId: hold.transaction.id, idempotencyKey: `wrong-${run}` }), /MEMBER_FORBIDDEN/);
    const confirm = { memberUserId: member.id, transactionId: hold.transaction.id, idempotencyKey: `confirm-${run}` };
    await confirmRedemption(db, confirm);
    assert.equal((await confirmRedemption(db, confirm)).idempotent, true);
    const refund = { actorUserId: staff.id, storeId: store.id, transactionId: earned.transaction.id, idempotencyKey: `refund-${run}` };
    await reverseRefund(db, refund);
    assert.equal((await reverseRefund(db, refund)).idempotent, true);
    const wallet = await getWalletSummary(db, member.id);
    assert.equal(wallet.pointBalance, 115);
    const lowMember=await db.robovUser.create({data:{email:`low-${run}@example.invalid`,displayName:'Low balance test',member:{create:{pointBalance:4}}}});
    await assert.rejects(requestRedemption(db, { ...voucher,memberUserId:lowMember.id,receiptNo: `LOW-${run}`, idempotencyKey: `insufficient-${run}` }), /INSUFFICIENT_POINTS/);
    const auditRows=await db.auditLog.findMany({where:{memberUserId:member.id}});
    const details=await require('../lib/robov/activity-details').activityDetails(db,auditRows);
    assert.equal(details.find(row=>row.targetId===earned.transaction.id).points,120);
    assert.equal(wallet.pointsOnHold, 0);
    assert.equal(wallet.transactions.length, 4);
    assert.equal(await db.auditLog.count({ where: { memberUserId: member.id } }), 5);
    console.log(JSON.stringify({ status: 'passed', checks: ['earn', 'idempotency', 'unique receipt rollback', 'store role', 'insufficient balance', 'member confirmation', 'refund', 'audit'], storeId: store.id, staffId: staff.id, memberEmail: member.email, memberId: member.id, finalBalance: wallet.pointBalance }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => { console.error('Test database verification failed; credentials are omitted.'); process.exitCode = 1; });
