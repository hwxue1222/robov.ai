const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function contextFor(nodes = [], saved = 'zh') {
  const context = vm.createContext({
    document: {
      title: 'ROBOV Points | 会员钱包', body: {}, documentElement: {},
      createTreeWalker() { let i = 0; return { nextNode: () => nodes[i++] || null }; },
      querySelector: selector => selector === 'title' ? {} : null,
      querySelectorAll: () => []
    },
    localStorage: { getItem: () => saved }, NodeFilter: { SHOW_TEXT: 4 },
    MutationObserver: class { observe() {} disconnect() {} }, requestAnimationFrame() {}
  });
  for (const file of ['locale-data.js', 'i18n.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  return context;
}

test('MY restores Malay and translates dynamic transaction and merchant messages', () => {
  const context = contextFor([], 'ms');
  assert.equal(context.document.documentElement.lang, 'ms');
  assert.equal(context.document.title, 'ROBOV Points | Dompet ahli');
  assert.equal(vm.runInContext("translate('确认兑换 20 RBP')", context), 'Sahkan penebusan 20 RBP');
  assert.equal(vm.runInContext("translate('已发放 30 RBP，交易 receipt-123')", context), '30 RBP diberikan · Transaksi receipt-123');
  assert.equal(vm.runInContext("translate('2 个商家')", context), '2 peniaga');
});

test('translations remain reversible after live text updates and never alter user input', () => {
  const node = { nodeValue: '已登录', parentElement: { closest: () => null } };
  const userText = { nodeValue: '会员钱包', parentElement: { closest: () => ({ tagName: 'TEXTAREA' }) } };
  const context = contextFor([node, userText], 'en');
  assert.equal(node.nodeValue, 'Signed in');
  vm.runInContext("language = 'ms'; applyLanguage()", context);
  assert.equal(node.nodeValue, 'Telah log masuk');
  node.nodeValue = '兑换已确认';
  vm.runInContext('applyLanguage()', context);
  assert.equal(node.nodeValue, 'Penebusan disahkan');
  vm.runInContext("language = 'zh'; applyLanguage()", context);
  assert.equal(node.nodeValue, '兑换已确认');
  assert.equal(userText.nodeValue, '会员钱包');
});
