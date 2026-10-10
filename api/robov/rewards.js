const { getReviewTasks } = require('../../lib/robov/rewards');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  return res.status(200).json({ tasks: getReviewTasks() });
};
