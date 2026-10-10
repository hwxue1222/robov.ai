const test = require('node:test'), assert = require('node:assert/strict');
const { fixedStaffStore, createEmployee, employeeGrant } = require('../lib/robov/staff-accounts');
test('staff has one fixed store while admins can have multiple assignments', () => {
  assert(fixedStaffStore({ role: 'STAFF', staffStoreId: 'store-a' }, 'store-a'));
  assert(!fixedStaffStore({ role: 'STAFF', staffStoreId: 'store-a' }, 'store-b'));
  assert(!fixedStaffStore({ role: 'STAFF' }, 'store-a'));
  assert(fixedStaffStore({ role: 'ADMIN' }, 'store-a'));
  assert(fixedStaffStore({ role: 'SUPERADMIN' }, 'store-b'));
});
test('only superadmin may create admins; staff requires exactly one authorized store', () => {
  const stores = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(employeeGrant({ role: 'SUPERADMIN' }, 'ADMIN', ['a','b'], stores), ['a','b']);
  assert.deepEqual(employeeGrant({ role: 'ADMIN' }, 'STAFF', ['a'], stores), ['a']);
  for (const [actor, role, ids] of [['ADMIN','ADMIN',['a']], ['STAFF','STAFF',['a']], ['SUPERADMIN','SUPERADMIN',['a']], ['ADMIN','STAFF',['a','b']], ['SUPERADMIN','ADMIN',[]], ['SUPERADMIN','ADMIN',['a','a']], ['ADMIN','STAFF',['other']]]) assert.throws(() => employeeGrant({ role: actor }, role, ids, stores), /STAFF_FORBIDDEN/);
});
test('admin provisioning creates multiple admin assignments without a wallet', async () => {
  let saved; const tx = { robovUser: { findUnique: async () => saved, create: async ({ data }) => (saved = data) } }, db = { $transaction: fn => fn(tx) };
  await createEmployee(db, { id: 'auth', email: 'admin@example.invalid', name: 'Admin' }, 'a', { role: 'ADMIN', storeIds: ['a','b'] });
  assert.equal(saved.role, 'ADMIN'); assert.equal(saved.staffStoreId, null); assert.equal(saved.member, undefined);
  assert.deepEqual(saved.staffStores.create.map(row => row.storeId), ['a','b']);
});
test('staff provisioning creates a fixed assignment but never a wallet or signup bonus', async () => {
  let saved;
  const tx = { robovUser: { findUnique: async () => saved, create: async ({ data }) => (saved = { id: 'staff', ...data }) } }, db = { ...tx, $transaction: fn => fn(tx) };
  const user = { id: 'auth', email: 'staff@example.invalid', name: 'Staff' };
  await createEmployee(db, user, 'store-a'); assert.equal(saved.role, 'STAFF'); assert.equal(saved.staffStoreId, 'store-a'); assert.equal(saved.member, undefined);
  await createEmployee(db, user, 'store-b'); assert.equal(saved.staffStoreId, 'store-a');
});
