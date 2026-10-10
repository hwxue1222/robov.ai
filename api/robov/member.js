const { getPrisma } = require('../../lib/robov/prisma');
const { requireTestMode } = require('../../lib/robov/config');
const { getWalletSummary } = require('../../lib/robov/ledger');
const { issueMemberQrToken, QR_TTL_SECONDS } = require('../../lib/robov/security');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireTestMode(res)) return;
  const memberUserId = req.headers['x-robov-user-id'] || req.query?.userId;
  if (!memberUserId) return res.status(401).json({ error: 'MEMBER_REQUIRED' });
  const prisma = getPrisma();
  try {
    if (req.method === 'GET') {
      const wallet = await getWalletSummary(prisma, memberUserId);
      return res.status(200).json({ wallet });
    }
    if (req.method === 'POST' && req.body?.action === 'qr') {
      const token = issueMemberQrToken(memberUserId);
      await prisma.auditLog.create({ data: { actorUserId: memberUserId, memberUserId, action: 'QR_ISSUED', targetType: 'MemberWallet', metadata: { ttlSeconds: QR_TTL_SECONDS } } });
      return res.status(200).json({ token, ttlSeconds: QR_TTL_SECONDS, expiresAt: new Date(Date.now() + QR_TTL_SECONDS * 1000).toISOString() });
    }
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (error) {
    console.error('ROBOV member failed', error.message);
    return res.status(error.message === 'ROBOV_QR_SECRET_NOT_CONFIGURED' ? 503 : 400).json({ error: error.message });
  }
};
