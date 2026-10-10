const test = require('node:test');
const assert = require('node:assert/strict');
const { requireTestMode } = require('../lib/robov/config');

test('points APIs fail closed in production even when demo mode is set', () => {
  let status;
  const res = { status(value) { status = value; return this; }, json() {} };
  assert.equal(requireTestMode(res, { VERCEL_ENV: 'production', ROBOV_DEMO_MODE: 'true', DATABASE_URL: 'test', ROBOV_QR_SECRET: 'test' }), false);
  assert.equal(status, 503);
  assert.equal(requireTestMode(res, {}), false);
  assert.equal(requireTestMode(res, { VERCEL_ENV: 'preview', ROBOV_DEMO_MODE: 'true' }), false);
  assert.equal(requireTestMode(res, { VERCEL_ENV: 'preview', ROBOV_DEMO_MODE: 'true', DATABASE_URL: 'test', ROBOV_QR_SECRET: 'test' }), true);
});
