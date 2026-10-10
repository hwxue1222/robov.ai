const crypto = require('node:crypto');
const { requireActor } = require('../../lib/robov/auth');
const { requireTestMode } = require('../../lib/robov/config');
const { getPrisma } = require('../../lib/robov/prisma');
const { earnPoints, requestRedemption, reverseRefund } = require('../../lib/robov/ledger');
const { verifyMemberQrToken } = require('../../lib/robov/security');

function idempotencyKey(req) {
  return req.headers['idempotency-key'] || req.body?.idempotencyKey || crypto.randomUUID();
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!requireTestMode(res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const user = await requireActor(req, res, true);
    if (!user) return;
    const storeId = req.body?.storeId;
    if (!user.stores.some(store => store.id === storeId)) return res.status(403).json({ error: 'STAFF_FORBIDDEN' });
    const actor = { userId: user.id, storeId };
    const prisma = getPrisma();
    const action = req.body?.action;
    let memberUserId = req.body?.memberUserId;
    if (req.body?.qrToken) {
      const scanned = verifyMemberQrToken(req.body.qrToken);
      memberUserId = scanned.memberUserId;
      await prisma.auditLog.create({ data: { actorUserId: actor.userId, memberUserId, storeId: actor.storeId, action: 'QR_SCANNED', targetType: 'RobovUser', targetId: memberUserId } });
    }
    if (action === 'earn') {
      const result = await earnPoints(prisma, { actorUserId: actor.userId, storeId: actor.storeId, memberUserId, amount: req.body.amount, receiptNo: req.body.receiptNo, idempotencyKey: idempotencyKey(req) });
      return res.status(200).json(result);
    }
    if (action === 'redeem') {
      const result = await requestRedemption(prisma, { actorUserId: actor.userId, storeId: actor.storeId, memberUserId, points: req.body.points, amount: req.body.amount, receiptNo: req.body.receiptNo, dineIn: req.body.dineIn, otherPromotion: req.body.otherPromotion, idempotencyKey: idempotencyKey(req) });
      return res.status(200).json(result);
    }
    if (action === 'refund') {
      const result = await reverseRefund(prisma, { actorUserId: actor.userId, storeId: actor.storeId, transactionId: req.body.transactionId, idempotencyKey: idempotencyKey(req) });
      return res.status(200).json(result);
    }
    return res.status(400).json({ error: 'UNKNOWN_ACTION' });
  } catch (error) {
    const status = error.message.includes('FORBIDDEN') ? 403 : error.message.includes('EXPIRED') ? 410 : 400;
    console.error('ROBOV staff failed', error.message);
    return res.status(status).json({ error: error.message });
  }
};
