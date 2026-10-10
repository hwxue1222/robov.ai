async function lockStore(tx, storeId) {
  // Serialize disabling with credits and member redemption decisions.
  await tx.$queryRaw`SELECT "id" FROM "Store" WHERE "id" = ${storeId} FOR UPDATE`;
}
async function releaseStoreHolds(tx, actor, storeId) {
  const holds = await tx.pointTransaction.findMany({ where: { storeId, type: 'REDEEM_HOLD', status: 'PENDING_MEMBER_CONFIRMATION' }, include: { wallet: true } });
  for (const hold of holds) {
    const changed = await tx.pointTransaction.updateMany({ where: { id: hold.id, status: 'PENDING_MEMBER_CONFIRMATION' }, data: { status: 'VOIDED' } });
    if (changed.count !== 1) continue;
    await tx.memberWallet.update({ where: { id: hold.walletId }, data: { pointsOnHold: { decrement: Math.abs(hold.points) } } });
    await tx.auditLog.create({ data: { actorUserId: actor.id, memberUserId: hold.wallet.userId, storeId, action: 'REDEMPTION_CANCELLED', targetType: 'PointTransaction', targetId: hold.id, metadata: { reason: 'STORE_DISABLED', points: Math.abs(hold.points) } } });
  }
  await tx.memberSelection.deleteMany({ where: { storeId } });
}
module.exports = { lockStore, releaseStoreHolds };
