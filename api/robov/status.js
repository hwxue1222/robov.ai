const { testModeEnabled } = require('../../lib/robov/config');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  return res.status(200).json({ testMode: testModeEnabled() });
};
