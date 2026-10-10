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

test('public beta requires explicit authorization, exact Neon test host and strong secrets', () => {
  const { testModeEnabled } = require('../lib/robov/config');
  const env = { VERCEL_ENV: 'production', ROBOV_DEMO_MODE: 'true', ROBOV_PUBLIC_TEST_MODE: 'true',
    ROBOV_TEST_DATABASE_HOST: 'ep-test.aws.neon.tech', DATABASE_URL: 'postgresql://user:password@ep-test-pooler.aws.neon.tech/db',
    ROBOV_QR_SECRET: 'q'.repeat(32), BETTER_AUTH_SECRET: 'a'.repeat(32) };
  assert.equal(testModeEnabled(env), true);
  for (const change of [{ ROBOV_PUBLIC_TEST_MODE: 'false' }, { DATABASE_URL: 'postgresql://user:password@other.aws.neon.tech/db' },
    { DATABASE_URL: 'invalid' }, { ROBOV_TEST_DATABASE_HOST: '' }, { BETTER_AUTH_SECRET: 'short' }, { ROBOV_QR_SECRET: 'short' }]) {
    assert.equal(testModeEnabled({ ...env, ...change }), false);
  }
});
