const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { saveProfile, setStoreActive, publicMerchants } = require('../lib/robov/store-profiles');
const db = new PrismaClient();
(async () => {
  if (new URL(process.env.DATABASE_URL).hostname.replace('-pooler', '') !== 'ep-fragrant-field-b3t3ibht.c-4.ap-southeast-1.aws.neon.tech') throw Error('Wrong database');
  const actor = await db.robovUser.findUnique({ where: { email: 'hwxue1222@gmail.com' } });
  assert.equal(actor.role, 'SUPERADMIN');
  const merchant = await db.merchant.findUnique({ where: { slug: 'jwd-mee-tarik' } });
  assert(merchant);
  const slug = 'rollback-store-' + require('node:crypto').randomUUID();
  let id;
  const rollback = new Error('EXPECTED_ROLLBACK');
  try {
    await db.$transaction(async tx => {
      const scoped = { $transaction: fn => fn(tx) };
      const input = { kind: 'store', slug, name: 'Rollback verification', merchantId: merchant.id, active: true, city: 'Johor', address: 'Validation only' };
      const created = await saveProfile(scoped, actor, input); id = created.id;
      assert(Number.isInteger(created.number)); assert(Number.isInteger(merchant.number));
      assert.equal((await tx.storeEarnPolicy.findUnique({ where: { storeId: id } })).baseRateBps, 300);
      assert.equal(await tx.storeStaff.count({ where: { storeId: id } }), 0);
      assert((await publicMerchants(tx)).some(row => row.outlets.some(outlet => outlet.id === slug)));
      await assert.rejects(saveProfile(scoped, actor, { ...input, id, version: 99 }), /STORE_PROFILE_CONFLICT/);
      const member = await tx.robovUser.create({ data: { displayName: 'Rollback only', member: { create: { pointBalance: 10, pointsOnHold: 5 } } }, include: { member: true } });
      const hold = await tx.pointTransaction.create({ data: { walletId: member.member.id, storeId: id, type: 'REDEEM_HOLD', status: 'PENDING_MEMBER_CONFIRMATION', points: -5, currency: 'MYR', idempotencyKey: slug } });
      const updated = await setStoreActive({ ...scoped, store: tx.store }, actor, { id, version: 1, active: false });
      assert.equal(updated.version, 2);
      assert.equal(updated.number, created.number);
      assert.equal((await tx.pointTransaction.findUnique({ where: { id: hold.id } })).status, 'VOIDED');
      const wallet = await tx.memberWallet.findUnique({ where: { id: member.member.id } });
      assert.equal(wallet.pointBalance, 10); assert.equal(wallet.pointsOnHold, 0);
      await assert.rejects(require('../lib/robov/ledger').earnPoints(scoped, { actorUserId: actor.id, storeId: id, memberUserId: member.id, amount: 100, receiptNo: 'ROLLBACK-123', idempotencyKey: slug + '-earn' }), /STAFF_FORBIDDEN/);
      assert(!(await publicMerchants(tx)).some(row => row.outlets.some(outlet => outlet.id === slug)));
      assert.equal(await tx.auditLog.count({ where: { targetId: id } }), 2);
      const enabled = await setStoreActive({ ...scoped, store: tx.store }, actor, { id, version: 2, active: true });
      assert.equal(enabled.number, created.number);
      assert.equal((await tx.pointTransaction.findUnique({ where: { id: hold.id } })).status, 'VOIDED');
      throw rollback;
    }, { timeout: 20000 });
  } catch (error) { if (error !== rollback) throw error; }
  assert.equal(await db.store.count({ where: { slug } }), 0);
  assert.equal(await db.auditLog.count({ where: { targetId: id } }), 0);
  console.log('Store creation, edit conflict, inactive visibility, audit and rollback verified; no test data persisted.');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
