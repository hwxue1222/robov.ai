const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateEarnPoints, normalizeReceiptNo, parseAmountCents } = require('../lib/robov/ledger');
const { issueMemberQrToken, verifyMemberQrToken, QR_TTL_SECONDS } = require('../lib/robov/security');

test('ROBOV earn points are calculated at 3 percent in whole points', () => {
  assert.equal(parseAmountCents('88.80'), 8880);
  assert.equal(calculateEarnPoints(8880), 2);
  assert.equal(calculateEarnPoints(10000), 3);
  assert.equal(calculateEarnPoints(9999), 2);
});

test('receipt numbers are normalized and bounded for store uniqueness', () => {
  assert.equal(normalizeReceiptNo(' rcp-10001 '), 'RCP-10001');
  assert.throws(() => normalizeReceiptNo('no'), /INVALID_RECEIPT/);
  assert.throws(() => normalizeReceiptNo('bad receipt'), /INVALID_RECEIPT/);
});

test('member dynamic codes are signed and expire after 60 seconds', () => {
  const oldSecret = process.env.ROBOV_QR_SECRET;
  process.env.ROBOV_QR_SECRET = 'unit-test-secret';
  try {
    const now = Date.UTC(2026, 9, 10, 12, 0, 0);
    const token = issueMemberQrToken('member_123', now);
    assert.equal(verifyMemberQrToken(token, now + 59000).memberUserId, 'member_123');
    assert.throws(() => verifyMemberQrToken(token.replace(/\w$/, 'x'), now), /INVALID_QR_SIGNATURE/);
    assert.throws(() => verifyMemberQrToken(token, now + (QR_TTL_SECONDS + 1) * 1000), /QR_EXPIRED/);
  } finally {
    if (oldSecret === undefined) delete process.env.ROBOV_QR_SECRET;
    else process.env.ROBOV_QR_SECRET = oldSecret;
  }
});
