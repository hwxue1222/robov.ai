function requireTestMode(res, env = process.env) {
  if (env.VERCEL_ENV === 'production' || env.ROBOV_DEMO_MODE !== 'true') {
    res.status(503).json({ error: 'ROBOV_AUTH_NOT_READY' });
    return false;
  }
  if (!env.DATABASE_URL || !env.ROBOV_QR_SECRET) {
    res.status(503).json({ error: 'ROBOV_NOT_CONFIGURED' });
    return false;
  }
  return true;
}

module.exports = { requireTestMode };
