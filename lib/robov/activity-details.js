async function activityDetails(db, rows) {
  const ids = [...new Set(rows.filter(row => row.targetType === 'PointTransaction').map(row => row.targetId))];
  const transactions = ids.length ? await db.pointTransaction.findMany({ where: { id: { in: ids } }, select: { id: true, points: true, wallet: { select: { userId: true } } } }) : [];
  const lookup = new Map(transactions.map(transaction => [transaction.id, transaction]));
  return rows.map(row => {
    const transaction = lookup.get(row.targetId);
    return { ...row, points: transaction?.wallet.userId === row.memberUserId ? transaction.points : null };
  });
}
function registrationType(member) {
  return member.invitationCodeId ? 'INVITED' : 'REGULAR';
}
module.exports = { activityDetails, registrationType };
