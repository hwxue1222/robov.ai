const test = require('node:test');
const assert = require('node:assert/strict');
const QRCode = require('qrcode');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const { issueMemberQrToken, verifyMemberQrToken } = require('../lib/robov/security');

test('real QR image roundtrips the complete signed member token and expires at 60 seconds', async () => {
  const old = process.env.ROBOV_QR_SECRET; process.env.ROBOV_QR_SECRET='roundtrip-test-secret';
  try {
    const now = 1700000000000, token = issueMemberQrToken('member-roundtrip',now);
    const image = PNG.sync.read(await QRCode.toBuffer(token,{width:512,margin:4,errorCorrectionLevel:'M'}));
    const decoded = jsQR(new Uint8ClampedArray(image.data),image.width,image.height);
    assert.equal(decoded.data,token);
    assert.equal(verifyMemberQrToken(decoded.data,now+59000).memberUserId,'member-roundtrip');
    assert.throws(()=>verifyMemberQrToken(token,now+60000),/QR_EXPIRED/);
    assert.throws(()=>verifyMemberQrToken(token+'.extra',now),/INVALID_QR_TOKEN/);
    assert.throws(()=>verifyMemberQrToken('x'.repeat(1025),now),/INVALID_QR_TOKEN/);
    assert.equal(jsQR(new Uint8ClampedArray(64*64*4).fill(255),64,64),null);
  } finally { if(old===undefined)delete process.env.ROBOV_QR_SECRET;else process.env.ROBOV_QR_SECRET=old; }
});
