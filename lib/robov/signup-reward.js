const DEFAULT_REWARDS = { signupEnabled: true, signupPoints: 100 };

async function rewardSettings(db) {
  return await db.rewardSettings.findUnique({ where: { id: 'default' } }) || DEFAULT_REWARDS;
}

async function createMember(db, user) {
  // Account, opening credit and audit commit together; a concurrent retry cannot credit twice.
  try {
    return await db.$transaction(async tx => {
      const existing = await tx.robovUser.findUnique({ where: { authUserId: user.id } });
      if (existing) return existing;
      const settings = await rewardSettings(tx);
      const points = settings.signupEnabled ? settings.signupPoints : 0;
      const member = await tx.robovUser.create({ data: { authUserId: user.id, email: user.email.toLowerCase(), displayName: user.name, role: 'MEMBER', member: { create: { pointBalance: points } } }, include: { member: true } });
      if (points > 0) {
        const key = `signup:${user.id}`;
        const credit = await tx.pointTransaction.create({ data: { walletId: member.member.id, type: 'ADJUSTMENT', status: 'POSTED', points, currency: 'MYR', idempotencyKey: key, metadata: { reason: 'SIGNUP_BONUS' } } });
        await tx.auditLog.create({ data: { memberUserId: member.id, action: 'POINTS_EARNED', targetType: 'PointTransaction', targetId: credit.id, idempotencyKey: key, metadata: { reason: 'SIGNUP_BONUS', points } } });
      }
      return member;
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const existing = await db.robovUser.findUnique({ where: { authUserId: user.id } });
      if (existing) return existing;
    }
    throw error;
  }
}

module.exports = { rewardSettings, createMember, DEFAULT_REWARDS };
