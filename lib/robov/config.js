function testModeEnabled(env = process.env) {
  if (env.ROBOV_DEMO_MODE !== 'true') return false;
  if (env.VERCEL_ENV !== 'production') return true;
  if (env.ROBOV_PUBLIC_TEST_MODE !== 'true' || !env.ROBOV_TEST_DATABASE_HOST) return false;
  try {
    const url = new URL(env.DATABASE_URL);
    return ['postgres:', 'postgresql:'].includes(url.protocol) &&
      url.hostname.replace('-pooler', '') === env.ROBOV_TEST_DATABASE_HOST &&
      env.ROBOV_TEST_DATABASE_HOST.endsWith('.aws.neon.tech') &&
      Boolean(env.BETTER_AUTH_SECRET?.length >= 32 && env.ROBOV_QR_SECRET?.length >= 32);
  } catch { return false; }
}

function requireTestMode(res, env = process.env) {
  if (!testModeEnabled(env)) {
    res.status(503).json({ error: 'ROBOV_AUTH_NOT_READY' });
    return false;
  }
  if (!env.DATABASE_URL || !env.ROBOV_QR_SECRET) {
    res.status(503).json({ error: 'ROBOV_NOT_CONFIGURED' });
    return false;
  }
  return true;
}

module.exports = { requireTestMode, testModeEnabled };
