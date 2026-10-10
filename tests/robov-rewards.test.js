const test = require('node:test');
const assert = require('node:assert/strict');
const { googleReviewUrl, getReviewTask, getReviewTasks } = require('../lib/robov/rewards');

test('review task accepts only HTTPS Google Maps links and never grants rewards', () => {
  assert.equal(googleReviewUrl('https://g.page/r/test/review'), 'https://g.page/r/test/review');
  assert.equal(googleReviewUrl('https://www.google.com/local/writereview?placeid=test'), 'https://www.google.com/local/writereview?placeid=test');
  for (const value of ['javascript:alert(1)', 'https://google.com.attacker.test/maps', 'https://google.com@attacker.test/maps', 'https://www.google.com/accounts', 'http://g.page/test', undefined]) assert.equal(googleReviewUrl(value), null);
  assert.equal(getReviewTask({}).available, false);
  const task = getReviewTask({ ROBOV_GOOGLE_REVIEW_URL: 'https://maps.app.goo.gl/test' });
  assert.equal(task.rewardPoints, 0);
  assert.equal(task.voluntary, true);
  assert.equal(task.available, true);
});

test('three JWD outlets have independent review links without points or ratings gates', () => {
  const tasks = getReviewTasks({});
  assert.equal(tasks.length, 3);
  assert.equal(new Set(tasks.map(task => task.url)).size, 3);
  assert.equal(new Set(tasks.map(task => task.id)).size, 3);
  for (const task of tasks) { assert.equal(task.rewardPoints, 0); assert.equal(task.voluntary, true); assert.equal(task.available, true); }
  assert.equal(getReviewTasks({ ROBOV_GOOGLE_REVIEW_PUTERI_HARBOUR: 'https://attacker.test/' })[0].available, false);
});
