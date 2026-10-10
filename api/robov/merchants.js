module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const enabled = require('../../lib/robov/config').testModeEnabled() && process.env.DATABASE_URL;
    const merchants = enabled ? await require('../../lib/robov/store-profiles').publicMerchants(require('../../lib/robov/prisma').getPrisma()) : require('../../data/merchants.json').merchants;
    return res.status(200).json({ merchants });
  } catch { return res.status(503).json({ error: 'MERCHANTS_UNAVAILABLE' }); }
};
