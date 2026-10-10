const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProfile, saveProfile, publicMerchants } = require('../lib/robov/store-profiles');
const store = { kind: 'store', name: 'JWD / New store', slug: 'new-store', active: true, merchantId: 'merchant' };
test('store and merchant profiles validate bounded fields and safe assets and review links', () => {
  assert.equal(validateProfile({ ...store, image: './assets/jwd/logo.png', address: 'First floor\nJohor' }, 'store').address, 'First floor\nJohor');
  for (const patch of [{ name: '' }, { slug: '../store' }, { image: 'javascript:alert(1)' }, { image: './assets/../secret' }, { email: 'bad' }, { reviewUrl: 'https://example.com/review' }, { active: 'true' }]) assert.throws(() => validateProfile({ ...store, ...patch }, 'store'), /INVALID_STORE_PROFILE/);
  assert.throws(() => validateProfile({ name: 'JWD', slug: 'jwd', website: 'https://user:pass@example.com' }, 'merchant'), /INVALID_STORE_PROFILE/);
});
test('only superadmin can create or edit store and merchant profiles', async () => {
  for (const role of ['MEMBER', 'STAFF', 'MANAGER', 'ADMIN']) await assert.rejects(saveProfile({}, { role }, store), /SUPERADMIN_REQUIRED/);
});
test('new store, default policy and audit use a single transaction without granting admins access', async () => {
  const calls = [];
  const tx = { merchant: { findUnique: async () => ({ id: 'merchant' }) }, store: { create: async ({ data }) => { calls.push('store'); return { id: 'new', ...data }; } }, storeEarnPolicy: { create: async ({ data }) => { calls.push('policy'); assert.equal(data.baseRateBps, 300); } }, auditLog: { create: async ({ data }) => { calls.push('audit'); assert.equal(data.targetId, 'new'); } } };
  await saveProfile({ $transaction: fn => fn(tx) }, { role: 'SUPERADMIN', id: 'actor' }, store);
  assert.deepEqual(calls, ['store', 'policy', 'audit']);
});
test('stale edits and changes to stable store codes are rejected before audit writes', async () => {
  const tx = { $queryRaw: async () => [], merchant: { findUnique: async () => ({}) }, store: { findUnique: async () => ({ id: 'one', slug: 'new-store' }), updateMany: async () => ({ count: 0 }) } };
  const db = { $transaction: fn => fn(tx) };
  for (const patch of [{ version: 1 }, { version: 1, slug: 'renamed' }]) await assert.rejects(saveProfile(db, { role: 'SUPERADMIN' }, { ...store, id: 'one', ...patch }), /STORE_PROFILE_CONFLICT/);
});
test('public merchant profiles expose only active outlet display information', async () => {
  const rows = await publicMerchants({ merchant: { findMany: async ({ include }) => {
    assert.equal(include.stores.where.active, true);
    return [{ id: 'private-id', slug: 'jwd', name: 'JWD', version: 4, createdAt: 'date', updatedAt: 'date', image: 'photo', stores: [{ id: 'internal', slug: 'outlet', name: 'JWD / Outlet', outletName: 'Outlet', active: true, email: 'private', version: 1 }] }];
  } } });
  assert.equal(rows[0].id, 'jwd'); assert.equal(rows[0].outlets[0].name, 'Outlet');
  assert.equal(rows[0].version, undefined); assert.equal(rows[0].outlets[0].email, undefined);
});
