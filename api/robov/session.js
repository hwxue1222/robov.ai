const { getPrisma } = require('../../lib/robov/prisma');
const { requireTestMode } = require('../../lib/robov/config');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireTestMode(res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const { email, phone, displayName } = req.body || {};
  const cleanEmail = typeof email === 'string' && email.includes('@') ? email.trim().toLowerCase() : null;
  const cleanPhone = typeof phone === 'string' && phone.trim().length >= 6 ? phone.trim() : null;
  if (!cleanEmail && !cleanPhone) return res.status(400).json({ error: 'EMAIL_OR_PHONE_REQUIRED' });
  const prisma = getPrisma();
  try {
    let user = await prisma.robovUser.upsert({
      where: cleanEmail ? { email: cleanEmail } : { phone: cleanPhone },
      update: { displayName: displayName || undefined },
      create: { email: cleanEmail, phone: cleanPhone, displayName: displayName || null, member: { create: {} } },
      include: { member: true }
    });
    if (!user.member) {
      user = await prisma.robovUser.update({ where: { id: user.id }, data: { member: { create: {} } }, include: { member: true } });
    }
    await prisma.auditLog.create({ data: { actorUserId: user.id, memberUserId: user.id, action: 'MEMBER_LOGIN', targetType: 'RobovUser', targetId: user.id } });
    return res.status(200).json({ user: { id: user.id, email: user.email, phone: user.phone, displayName: user.displayName }, wallet: { pointBalance: user.member.pointBalance, pointsOnHold: user.member.pointsOnHold } });
  } catch (error) {
    console.error('ROBOV session failed', error.message);
    return res.status(500).json({ error: 'SESSION_FAILED' });
  }
};
