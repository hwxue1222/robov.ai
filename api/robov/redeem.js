const { getPrisma } = require('../../lib/robov/prisma');
const { confirmRedemption } = require('../../lib/robov/ledger');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const memberUserId = req.headers['x-robov-user-id'];
  if (!memberUserId) return res.status(401).json({ error: 'MEMBER_REQUIRED' });
  try {
    const result = await confirmRedemption(getPrisma(), { memberUserId, transactionId: req.body?.transactionId, idempotencyKey: req.headers['idempotency-key'] || req.body?.idempotencyKey });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.message.includes('FORBIDDEN') ? 403 : 400;
    console.error('ROBOV redemption failed', error.message);
    return res.status(status).json({ error: error.message });
  }
};
