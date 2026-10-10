const { getPrisma } = require('../../lib/robov/prisma');
const { requireActor } = require('../../lib/robov/auth');
const { requireTestMode } = require('../../lib/robov/config');
const { confirmRedemption, cancelRedemption } = require('../../lib/robov/ledger');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireTestMode(res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const actor = await requireActor(req, res);
    if (!actor) return;
    const memberUserId = actor.id;
    const action = req.body?.action || 'confirm';
    if (!['confirm', 'cancel'].includes(action)) return res.status(400).json({ error: 'UNKNOWN_ACTION' });
    const result = await (action === 'cancel' ? cancelRedemption : confirmRedemption)(getPrisma(), { memberUserId, transactionId: req.body?.transactionId, idempotencyKey: req.headers['idempotency-key'] || req.body?.idempotencyKey });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.message.includes('FORBIDDEN') ? 403 : 400;
    console.error('ROBOV redemption failed', error.message);
    return res.status(status).json({ error: error.message });
  }
};
