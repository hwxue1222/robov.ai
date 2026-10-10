const test = require('node:test'), assert = require('node:assert/strict');
const { fixedStaffStore, createEmployee } = require('../lib/robov/staff-accounts');
test('staff has one fixed store while admins can have multiple assignments', () => {
  assert(fixedStaffStore({ role: 'STAFF', staffStoreId: 'store-a' }, 'store-a'));
  assert(!fixedStaffStore({ role: 'STAFF', staffStoreId: 'store-a' }, 'store-b'));
  assert(!fixedStaffStore({ role: 'STAFF' }, 'store-a'));
  assert(fixedStaffStore({ role: 'ADMIN' }, 'store-a'));
  assert(fixedStaffStore({ role: 'SUPERADMIN' }, 'store-b'));
});
test('staff provisioning creates a fixed assignment but never a wallet or signup bonus', async () => {
  let saved;
  const tx = { robovUser: { findUnique: async () => saved, create: async ({ data }) => (saved = { id: 'staff', ...data }) } }, db = { ...tx, $transaction: fn => fn(tx) };
  const user = { id: 'auth', email: 'staff@example.invalid', name: 'Staff' };
  await createEmployee(db, user, 'store-a'); assert.equal(saved.role, 'STAFF'); assert.equal(saved.staffStoreId, 'store-a'); assert.equal(saved.member, undefined);
  await createEmployee(db, user, 'store-b'); assert.equal(saved.staffStoreId, 'store-a');
});
