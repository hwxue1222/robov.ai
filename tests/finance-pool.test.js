const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function context(title, fetch) {
  const c = vm.createContext({
    personalizedGraph: { nodes: [{ id: 'n1', title }] }, selectedNode: 'n1',
    $$: () => [], $: () => ({ addEventListener() {} }),
    fetch, AbortSignal, setTimeout, clearTimeout
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../pool.js'), 'utf8'), c);
  vm.runInContext('renderPoolItems = () => {};', c);
  return c;
}

test('financial source routing avoids unrelated news and supports bilingual nodes', () => {
  for (const [zh, en, expected] of [
    ['咖啡萃取', 'Coffee extraction', ''], ['利率传导', 'Interest rate transmission', '利率'],
    ['资产配置', 'Asset allocation', '资产配置'], ['平安银行 000001', 'Ping An Bank 000001', '000001'],
    ['需求预测与库存周转', 'Inventory turnover', '库存'],
    ['宏观基础', 'Inflation expectations', '通货膨胀']
  ]) assert.equal(vm.runInContext('poolFinanceQuery()', context({ zh, en })), expected);
});

test('finance fetching caches results, requests encoded keywords and keeps errors distinct', async () => {
  let calls = 0;
  const c = context({ zh: '利率', en: 'Interest rates' }, async url => {
    calls++; assert.equal(url, '/api/finance?q=' + encodeURIComponent('利率'));
    return { ok: true, json: async () => ({ articles: [] }) };
  });
  await vm.runInContext('loadPoolFinance()', c);
  await vm.runInContext('loadPoolFinance()', c);
  assert.equal(calls, 1);
  assert.equal(vm.runInContext("financeCache.get('利率').error", c), undefined);
  c.fetch = async () => { throw new Error('unavailable'); };
  vm.runInContext('financeCache.clear()', c);
  await vm.runInContext('loadPoolFinance()', c);
  assert.equal(vm.runInContext("financeCache.get('利率').error", c), true);
});
