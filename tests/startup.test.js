const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('app listeners initialize before the generation script is loaded', () => {
  const listeners = new Map();
  const context = vm.createContext({
    document: {
      querySelector: selector => ({ addEventListener: (event, handler) => listeners.set(selector + ':' + event, handler) }),
      querySelectorAll: () => []
    },
    window: { addEventListener() {} },
    backToNode() {}, drawEdges() {}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8'), context);
  assert.equal(typeof listeners.get('#return-network:click'), 'function');
  assert.equal(typeof listeners.get('#complete-learning:click'), 'function');
  let returned = false;
  context.returnToNetwork = () => { returned = true; };
  listeners.get('#return-network:click')();
  assert.equal(returned, true);
});

test('previous-node navigation consumes exactly one history entry', () => {
  let chosen;
  const context = vm.createContext({
    generating: false,
    personalizedGraph: { sessionId: 'test', nodes: [{ id: 'root', domain: 'd' }, { id: 'previous', domain: 'd' }, { id: 'current', domain: 'd' }] },
    setTopic: (domain, id) => { chosen = id; },
    $: () => ({ scrollIntoView() {} })
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../network.js'), 'utf8'), context);
  vm.runInContext("nodeHistory.test = ['root', 'previous']; backToNode();", context);
  assert.equal(chosen, 'previous');
  assert.equal(vm.runInContext('nodeHistory.test.length', context), 1);
});
