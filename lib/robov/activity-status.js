function activityStatus(enabled, endsAt, now = Date.now()) {
  if (endsAt && new Date(endsAt).getTime() <= now) return 'expired';
  return enabled ? 'ongoing' : 'paused';
}
function parseActivityDates(input) {
  const result = {};
  for (const key of ['signupEndsAt', 'reviewEndsAt', 'voucherEndsAt']) {
    if (!(key in input)) continue;
    if (input[key] === null || input[key] === '') { result[key] = null; continue; }
    if (typeof input[key] !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(input[key])) throw new Error('INVALID_ACTIVITY_DATE');
    const date = new Date(input[key]);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,19) !== input[key].slice(0,19)) throw new Error('INVALID_ACTIVITY_DATE');
    result[key] = date;
  }
  return result;
}
module.exports = { activityStatus, parseActivityDates };
