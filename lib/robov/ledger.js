const EARN_RATE = 0.03;
const CENTS_PER_POINT = 100;

function normalizeReceiptNo(receiptNo) {
  if (typeof receiptNo !== 'string') throw new Error('INVALID_RECEIPT');
  const value = receiptNo.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{2,63}$/.test(value)) throw new Error('INVALID_RECEIPT');
  return value;
}

function parseAmountCents(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('INVALID_AMOUNT');
  return Math.round(value * 100);
}

function calculateEarnPoints(amountCents) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error('INVALID_AMOUNT');
  return Math.floor(amountCents * EARN_RATE / CENTS_PER_POINT);
}

function assertStaffRole(staff) {
  if (!staff || !staff.active || !['STAFF', 'MANAGER', 'ADMIN'].includes(staff.role)) throw new Error('STAFF_FORBIDDEN');
}

async function audit(tx, input) {
  return tx.auditLog.create({ data: input });
}

async function requireStoreStaff(tx, actorUserId, storeId) {
  const store = await tx.store.findUnique({ where: { id: storeId } });
  if (!store?.active) throw new Error('STAFF_FORBIDDEN');
  const user = await tx.robovUser.findUnique({ where: { id: actorUserId } });
  if (user?.role === 'SUPERADMIN') return { role: 'SUPERADMIN', active: true };
  const staff = await tx.storeStaff.findUnique({ where: { storeId_userId: { storeId, userId: actorUserId } } });
  assertStaffRole(staff);
  return staff;
}

async function getWalletSummary(prisma, memberUserId) {
  const wallet = await prisma.memberWallet.findUnique({
    where: { userId: memberUserId },
    include: { transactions: { orderBy: { createdAt: 'desc' }, take: 30 } }
  });
  if (!wallet) throw new Error('WALLET_NOT_FOUND');
  return {
    walletId: wallet.id,
    pointBalance: wallet.pointBalance,
    pointsOnHold: wallet.pointsOnHold,
    availablePoints: wallet.pointBalance - wallet.pointsOnHold,
    transactions: wallet.transactions
  };
}

async function earnPoints(prisma, input) {
  const amountCents = parseAmountCents(input.amount);
  const receiptNo = normalizeReceiptNo(input.receiptNo);
  const points = calculateEarnPoints(amountCents);
  if (points <= 0) throw new Error('AMOUNT_TOO_SMALL_FOR_POINTS');
  return prisma.$transaction(async tx => {
    await requireStoreStaff(tx, input.actorUserId, input.storeId);
    const existing = await tx.pointTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.storeId !== input.storeId) throw new Error('IDEMPOTENCY_CONFLICT');
      return { transaction: existing, idempotent: true };
    }
    const wallet = await tx.memberWallet.findUnique({ where: { userId: input.memberUserId } });
    if (!wallet) throw new Error('WALLET_NOT_FOUND');
    const transaction = await tx.pointTransaction.create({
      data: {
        walletId: wallet.id,
        storeId: input.storeId,
        actorUserId: input.actorUserId,
        type: 'EARN',
        status: 'POSTED',
        points,
        amountCents,
        receiptNo,
        idempotencyKey: input.idempotencyKey,
        metadata: { earnRate: EARN_RATE }
      }
    });
    await tx.memberWallet.update({ where: { id: wallet.id }, data: { pointBalance: { increment: points } } });
    await audit(tx, { actorUserId: input.actorUserId, memberUserId: input.memberUserId, storeId: input.storeId, action: 'POINTS_EARNED', targetType: 'PointTransaction', targetId: transaction.id, idempotencyKey: input.idempotencyKey, metadata: { points, receiptNo, amountCents } });
    return { transaction, idempotent: false };
  });
}

async function requestRedemption(prisma, input) {
  const points = Number(input.points);
  if (points !== 100) throw new Error('VOUCHER_REQUIRES_100_POINTS');
  const amountCents = parseAmountCents(input.amount);
  const receiptNo = normalizeReceiptNo(input.receiptNo);
  if (amountCents < 5000 || input.dineIn !== true || input.otherPromotion !== false) throw new Error('VOUCHER_TERMS_NOT_MET');
  return prisma.$transaction(async tx => {
    await requireStoreStaff(tx, input.actorUserId, input.storeId);
    const existing = await tx.pointTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.storeId !== input.storeId) throw new Error('IDEMPOTENCY_CONFLICT');
      return { transaction: existing, idempotent: true };
    }
    const settings = await require('./signup-reward').rewardSettings(tx);
    if (require('./activity-status').activityStatus(true, settings.voucherEndsAt) !== 'ongoing') throw new Error('ACTIVITY_EXPIRED');
    const wallet = await tx.memberWallet.findUnique({ where: { userId: input.memberUserId } });
    if (!wallet) throw new Error('WALLET_NOT_FOUND');
    const reserved = await tx.memberWallet.updateMany({ where: { id: wallet.id, pointBalance: { gte: points + wallet.pointsOnHold }, pointsOnHold: wallet.pointsOnHold }, data: { pointsOnHold: { increment: points } } });
    if (reserved.count !== 1) throw new Error('INSUFFICIENT_POINTS');
    const transaction = await tx.pointTransaction.create({
      data: {
        walletId: wallet.id,
        storeId: input.storeId,
        actorUserId: input.actorUserId,
        type: 'REDEEM_HOLD',
        status: 'PENDING_MEMBER_CONFIRMATION',
        points: -points,
        amountCents,
        receiptNo,
        currency: 'MYR',
        idempotencyKey: input.idempotencyKey,
        metadata: { requestedBy: input.actorUserId, discountCents: 500, dineIn: true, otherPromotion: false, termsVersion: '2026-10-10' }
      }
    });
    await audit(tx, { actorUserId: input.actorUserId, memberUserId: input.memberUserId, storeId: input.storeId, action: 'REDEMPTION_REQUESTED', targetType: 'PointTransaction', targetId: transaction.id, idempotencyKey: input.idempotencyKey, metadata: { points } });
    return { transaction, idempotent: false };
  });
}

async function confirmRedemption(prisma, input) {
  return prisma.$transaction(async tx => {
    const hold = await tx.pointTransaction.findUnique({ where: { id: input.transactionId }, include: { wallet: true } });
    if (!hold || hold.type !== 'REDEEM_HOLD') throw new Error('REDEMPTION_NOT_FOUND');
    if (hold.wallet.userId !== input.memberUserId) throw new Error('MEMBER_FORBIDDEN');
    if (hold.status !== 'PENDING_MEMBER_CONFIRMATION') return { transaction: hold, idempotent: true };
    const points = Math.abs(hold.points);
    const claimed = await tx.pointTransaction.updateMany({ where: { id: hold.id, status: 'PENDING_MEMBER_CONFIRMATION' }, data: { status: 'POSTED', memberConfirmedAt: new Date() } });
    if (claimed.count !== 1) return { transaction: await tx.pointTransaction.findUnique({ where: { id: hold.id } }), idempotent: true };
    const updated = await tx.pointTransaction.findUnique({ where: { id: hold.id } });
    await tx.memberWallet.update({ where: { id: hold.walletId }, data: { pointBalance: { decrement: points }, pointsOnHold: { decrement: points } } });
    await audit(tx, { actorUserId: input.memberUserId, memberUserId: input.memberUserId, storeId: hold.storeId, action: 'REDEMPTION_CONFIRMED', targetType: 'PointTransaction', targetId: hold.id, idempotencyKey: input.idempotencyKey, metadata: { points } });
    return { transaction: updated, idempotent: false };
  });
}

async function reverseRefund(prisma, input) {
  return prisma.$transaction(async tx => {
    await requireStoreStaff(tx, input.actorUserId, input.storeId);
    const existing = await tx.pointTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.storeId !== input.storeId) throw new Error('IDEMPOTENCY_CONFLICT');
      return { transaction: existing, idempotent: true };
    }
    const original = await tx.pointTransaction.findUnique({ where: { id: input.transactionId }, include: { wallet: true } });
    if (!original || original.type !== 'EARN' || original.status !== 'POSTED' || original.storeId !== input.storeId) throw new Error('EARN_TRANSACTION_NOT_FOUND');
    const already = await tx.pointTransaction.findFirst({ where: { relatedTransactionId: original.id, type: 'REFUND_REVERSAL', status: 'POSTED' } });
    if (already) return { transaction: already, idempotent: true };
    const reversal = await tx.pointTransaction.create({
      data: {
        walletId: original.walletId,
        storeId: input.storeId,
        actorUserId: input.actorUserId,
        type: 'REFUND_REVERSAL',
        status: 'POSTED',
        points: -original.points,
        amountCents: original.amountCents,
        currency: original.currency,
        receiptNo: original.receiptNo,
        relatedTransactionId: original.id,
        idempotencyKey: input.idempotencyKey
      }
    });
    await tx.pointTransaction.update({ where: { id: original.id }, data: { status: 'REVERSED' } });
    await tx.memberWallet.update({ where: { id: original.walletId }, data: { pointBalance: { decrement: original.points } } });
    await audit(tx, { actorUserId: input.actorUserId, memberUserId: original.wallet.userId, storeId: input.storeId, action: 'REFUND_REVERSED', targetType: 'PointTransaction', targetId: reversal.id, idempotencyKey: input.idempotencyKey, metadata: { originalTransactionId: original.id } });
    return { transaction: reversal, idempotent: false };
  });
}

module.exports = { EARN_RATE, calculateEarnPoints, normalizeReceiptNo, parseAmountCents, getWalletSummary, earnPoints, requestRedemption, confirmRedemption, reverseRefund };
