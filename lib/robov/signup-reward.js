const DEFAULT_REWARDS = { signupEnabled: true, signupPoints: 5 };

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
      const basePoints = require('./activity-status').activityStatus(settings.signupEnabled, settings.signupEndsAt) === 'ongoing' ? settings.signupPoints : 0;
      const activities = await require('./activities').signupActivities(tx);
      const points = basePoints + activities.reduce((sum,activity)=>sum+activity.points,0);
      const member = await tx.robovUser.create({ data: { authUserId: user.id, email: user.email.toLowerCase(), displayName: user.name, role: 'MEMBER', ...(user.invitationCodeId ? { invitationCodeId: user.invitationCodeId } : {}), member: { create: { pointBalance: points } } }, include: { member: true } });
      if (user.invitationCodeId) await tx.auditLog.create({ data: { memberUserId: member.id, action: 'MEMBER_INVITED', targetType: 'InvitationCode', targetId: user.invitationCodeId } });
      if (basePoints > 0) {
        const key = `signup:${user.id}`;
        const credit = await tx.pointTransaction.create({ data: { walletId: member.member.id, type: 'ADJUSTMENT', status: 'POSTED', points:basePoints, currency: 'MYR', idempotencyKey: key, metadata: { reason: 'SIGNUP_BONUS' } } });
        await tx.auditLog.create({ data: { memberUserId: member.id, action: 'POINTS_EARNED', targetType: 'PointTransaction', targetId: credit.id, idempotencyKey: key, metadata: { reason: 'SIGNUP_BONUS', points:basePoints } } });
      }
      for(const activity of activities.filter(row=>row.points>0)){
        const key=`signup-activity:${activity.id}:${user.id}`;
        const metadata={reason:'SIGNUP_BONUS',activityId:activity.id,title:activity.title,activityVersion:activity.version};
        const credit=await tx.pointTransaction.create({data:{walletId:member.member.id,type:'ADJUSTMENT',status:'POSTED',points:activity.points,currency:'MYR',idempotencyKey:key,metadata}});
        await tx.auditLog.create({data:{memberUserId:member.id,action:'POINTS_EARNED',targetType:'PointTransaction',targetId:credit.id,idempotencyKey:key,metadata:{...metadata,points:activity.points}}});
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
