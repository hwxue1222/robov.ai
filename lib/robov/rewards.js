function googleReviewUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const shortLink = ['g.page', 'maps.app.goo.gl'].includes(url.hostname);
    const mapsLink = ['google.com', 'www.google.com', 'maps.google.com'].includes(url.hostname)
      && (url.pathname.startsWith('/maps') || url.pathname === '/local/writereview');
    return shortLink || mapsLink ? url.href : null;
  } catch { return null; }
}

function getReviewTask(env = process.env) {
  const url = googleReviewUrl(env.ROBOV_GOOGLE_REVIEW_URL);
  return { id: 'google-review', title: 'Google Review', businessName: env.ROBOV_REVIEW_BUSINESS_NAME || null, rewardPoints: 0, voluntary: true, url, available: Boolean(url) };
}

function getReviewTasks(env = process.env, merchants = require('../../data/merchants.json').merchants) {
  return merchants.flatMap(merchant => merchant.outlets.map(outlet => {
    const key = `ROBOV_GOOGLE_REVIEW_${outlet.id.replaceAll('-', '_').toUpperCase()}`;
    const url = googleReviewUrl(env[key] || outlet.reviewUrl);
    return { id: `google-review-${merchant.id}-${outlet.id}`, merchantId: merchant.id, outletId: outlet.id, title: 'Google Review', businessName: merchant.name, storeName: outlet.name, address: outlet.address, rewardPoints: 0, voluntary: true, url, available: Boolean(url) };
  }));
}

module.exports = { googleReviewUrl, getReviewTask, getReviewTasks };
