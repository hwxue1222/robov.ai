const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function screen() {
  let now = 1000, timer, interval;
  const nodes = new Map(), events = {}, requests = [];
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { value: '', textContent: '', checked: false, dataset: {}, events: {}, addEventListener(type, fn) { this.events[type] = fn; }, setAttribute() {} });
    return nodes.get(selector);
  };
  const window = { addEventListener(type, fn) { events[type] = fn; }, dispatchEvent(event) { events[event.type]?.(event); } };
  const document = { hidden: false, querySelector: node, addEventListener(type, fn) { events[type] = fn; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../staff.js'), 'utf8'), {
    window, document, localStorage: { getItem: () => 'store', setItem() {} },
    Date: class extends Date { static now() { return now; } },
    setTimeout(fn, delay) { timer = { fn, until: now + delay }; return 1; }, clearTimeout() { timer = null; },
    setInterval(fn) { interval = fn; return 2; }, clearInterval() { interval = null; },
    Event: class { constructor(type) { this.type = type; } },
    fetch(url, options) { if (url.includes('session')) return new Promise(() => {}); requests.push(JSON.parse(options.body)); return Promise.resolve({ ok: true, json: async () => ({ cleared: true }) }); }
  });
  return { window, node, events, requests, tick(delta) { now += delta; if (timer && timer.until <= now) { const fn = timer.fn; timer = null; fn(); } interval?.(); } };
}
function fill(ui) {
  ui.window.RobovSelectedMember.set('token', 301000);
  for (const key of ['scan-token', 'amount', 'receipt-no', 'redeem-amount', 'redeem-receipt', 'transaction-id']) ui.node('#' + key).value = 'member data';
  ui.node('#scanned-member').textContent = 'Member'; ui.node('#redeem-eligible').checked = true;
}
function cleared(ui) {
  assert.equal(ui.window.RobovSelectedMember.active, false);
  for (const key of ['scan-token', 'amount', 'receipt-no', 'redeem-amount', 'redeem-receipt', 'transaction-id']) assert.equal(ui.node('#' + key).value, '');
  assert.equal(ui.node('#scanned-member').textContent, ''); assert.equal(ui.node('#redeem-eligible').checked, false);
  assert.equal(ui.node('#member-countdown').hidden, true);
  assert.equal(ui.node('#member-countdown-value').textContent, '');
}
test('member expires at exactly five minutes and clears identity and operation fields', async () => {
  const ui = screen(); fill(ui); ui.tick(299999); assert.equal(ui.window.RobovSelectedMember.active, true);
  ui.tick(1); cleared(ui); assert.equal(ui.requests[0].action, 'clear-member');
  await assert.rejects(ui.window.RobovSelectedMember.quote('50'), /MEMBER_NOT_SELECTED/);
});
test('manual exit and page close clear member fields immediately', async () => {
  for (const close of [false, true]) {
    const ui = screen(); fill(ui);
    if (close) ui.events.pagehide(); else await ui.node('#exit-member').events.click({ type: 'click' });
    cleared(ui);
  }
});
test('expiry during an in-flight operation clears immediately and revokes when it finishes', () => {
  const ui = screen(); fill(ui); ui.window.RobovSelectedMember.verifying(true); ui.tick(300000);
  cleared(ui); assert.equal(ui.requests.length, 0);
  ui.window.RobovSelectedMember.verifying(false); assert.equal(ui.requests[0].action, 'clear-member');
});
test('countdown uses the fixed deadline, warns in the last minute and resets for a new member', async () => {
  const ui = screen(); fill(ui);
  assert.equal(ui.node('#member-countdown-value').textContent, '05:00');
  ui.tick(1000); assert.equal(ui.node('#member-countdown-value').textContent, '04:59');
  ui.tick(239000); assert.equal(ui.node('#member-countdown-value').textContent, '01:00');
  assert.equal(ui.node('#member-countdown').dataset.urgent, 'true');
  ui.window.RobovSelectedMember.set('replacement', 541000);
  assert.equal(ui.node('#member-countdown-value').textContent, '05:00');
  assert.equal(ui.node('#member-countdown').dataset.urgent, 'false');
  await ui.node('#exit-member').events.click({ type: 'click' }); cleared(ui);
});
