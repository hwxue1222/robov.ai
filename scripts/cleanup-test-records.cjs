const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const ids = rows => rows.map(row => row.id);
const testStore = slug => slug === 'robov-test-store' || /^(future|camera-policy|invitation-test|staff-test)-[0-9a-f-]{36}$/.test(slug);
const testActivity = title => ['Synthetic welcome 25', 'Synthetic welcome 10', 'Synthetic RM10', 'Synthetic tasting task'].includes(title) || /^UI task (desktop|mobile) [0-9a-f-]{36}$/.test(title);

async function inventory(tx) {
  const auth = await tx.authUser.findMany({ where: { email: { endsWith: '@example.invalid' } } });
  const users = await tx.robovUser.findMany({ where: { OR: [{ email: { endsWith: '@example.invalid' } }, { authUserId: { in: ids(auth) } }, { displayName: 'Invitation staff boundary test', email: null, authUserId: null }] } });
  const candidateStores = (await tx.store.findMany()).filter(row => testStore(row.slug));
  const activities = (await tx.rewardActivity.findMany()).filter(row => testActivity(row.title));
  const invitations = await tx.invitationCode.findMany({ where: { code: { startsWith: 'TESTINV-' } } });
  const wallets = await tx.memberWallet.findMany({ where: { userId: { in: ids(users) } } });
  const roleTests = (await tx.pointTransaction.findMany({ where: { receiptNo: { startsWith: 'ROLE-' }, storeId: { in: ids(candidateStores) }, wallet: { user: { email: 'jinweide.my@gmail.com' } } } })).filter(row => /^ROLE-[0-9A-F-]{36}$/.test(row.receiptNo) && row.type === 'EARN' && row.status === 'POSTED' && row.points === 3);
  const transactions = [...await tx.pointTransaction.findMany({ where: { walletId: { in: ids(wallets) } } }), ...roleTests];
  const usedStores = await tx.pointTransaction.findMany({ where: { storeId: { in: ids(candidateStores) }, id: { notIn: ids(transactions) } }, select: { storeId: true } });
  const stores = candidateStores.filter(row => !usedStores.some(used => used.storeId === row.id));
  // Stop if a test object is referenced by an account or wallet outside the allowlist.
  const foreign = await Promise.all([
    tx.robovUser.count({ where: { id: { notIn: ids(users) }, OR: [{ invitationCodeId: { in: ids(invitations) } }, { staffStoreId: { in: ids(stores) } }] } }),
    tx.authUser.count({ where: { id: { notIn: ids(auth) }, OR: [{ invitationCodeId: { in: ids(invitations) } }, { employeeStoreId: { in: ids(stores) } }] } }),
    tx.pointTransaction.count({ where: { storeId: { in: ids(stores) }, id: { notIn: ids(transactions) } } }),
    tx.rewardActivity.count({ where: { storeId: { in: ids(stores) }, id: { notIn: ids(activities) } } }),
    tx.invitationCode.count({ where: { storeId: { in: ids(stores) }, id: { notIn: ids(invitations) } } })
  ]);
  if (foreign.some(Boolean)) throw Error('Unclassified references require inspection: ' + JSON.stringify(foreign));
  const targets = [...ids(auth), ...ids(users), ...ids(stores), ...ids(activities), ...ids(invitations), ...ids(wallets), ...ids(transactions)];
  const auditWhere = { OR: [{ actorUserId: { in: ids(users) } }, { memberUserId: { in: ids(users) } }, { storeId: { in: ids(stores) } }, { targetId: { in: targets } }] };
  const selectionWhere = { OR: [{ actorUserId: { in: ids(users) } }, { memberUserId: { in: ids(users) } }, { storeId: { in: ids(stores) } }] };
  return { auth, users, stores, activities, invitations, wallets, transactions, roleTests, retainedStores: candidateStores.filter(row => !ids(stores).includes(row.id)), auditWhere, selectionWhere };
}

async function main() {
  if (new URL(process.env.DATABASE_URL).hostname.replace('-pooler', '') !== 'ep-fragrant-field-b3t3ibht.c-4.ap-southeast-1.aws.neon.tech') throw Error('Wrong database');
  const apply = process.argv.includes('--apply');
  await db.$transaction(async tx => {
    const data = await inventory(tx);
    const counts = Object.fromEntries(['auth', 'users', 'stores', 'activities', 'invitations', 'wallets', 'transactions'].map(key => [key, data[key].length]));
    counts.audit = await tx.auditLog.count({ where: data.auditWhere });
    counts.selections = await tx.memberSelection.count({ where: data.selectionWhere });
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', counts, retainedStores: data.retainedStores.map(row => row.slug), removedTestCredits: data.roleTests.reduce((sum,row) => sum + row.points, 0) }));
    if (!apply) return;
    const preservedUsers = await tx.robovUser.findMany({ where: { id: { notIn: ids(data.users) } }, orderBy: { id: 'asc' } });
    const preservedWallets = await tx.memberWallet.findMany({ where: { id: { notIn: ids(data.wallets) } }, orderBy: { id: 'asc' } });
    const preservedStores = await tx.store.findMany({ where: { id: { notIn: ids(data.stores) } }, orderBy: { id: 'asc' } });
    await tx.memberSelection.deleteMany({ where: data.selectionWhere });
    await tx.auditLog.deleteMany({ where: data.auditWhere });
    for (const row of data.roleTests) {
      const result = await tx.memberWallet.updateMany({ where: { id: row.walletId, pointBalance: { gte: row.points } }, data: { pointBalance: { decrement: row.points } } });
      if (result.count !== 1) throw Error('Cannot reconcile test credit');
      const expected = preservedWallets.find(wallet => wallet.id === row.walletId);
      expected.pointBalance -= row.points;
    }
    await tx.pointTransaction.deleteMany({ where: { id: { in: ids(data.transactions) } } });
    await tx.memberWallet.deleteMany({ where: { id: { in: ids(data.wallets) } } });
    await tx.storeStaff.deleteMany({ where: { OR: [{ userId: { in: ids(data.users) } }, { storeId: { in: ids(data.stores) } }] } });
    await tx.robovUser.deleteMany({ where: { id: { in: ids(data.users) } } });
    await tx.authVerification.deleteMany({ where: { identifier: { in: data.auth.map(row => row.email) } } });
    await tx.authUser.deleteMany({ where: { id: { in: ids(data.auth) } } });
    await tx.invitationCode.deleteMany({ where: { id: { in: ids(data.invitations) } } });
    await tx.rewardActivity.deleteMany({ where: { id: { in: ids(data.activities) } } });
    await tx.storeEarnPolicy.deleteMany({ where: { storeId: { in: ids(data.stores) } } });
    await tx.store.deleteMany({ where: { id: { in: ids(data.stores) } } });
    const remaining = await inventory(tx);
    if (['auth', 'users', 'stores', 'activities', 'invitations', 'wallets', 'transactions'].some(key => remaining[key].length)) throw Error('Test records remain');
    for (const [model, before] of [['robovUser', preservedUsers], ['memberWallet', preservedWallets], ['store', preservedStores]]) {
      const after = await tx[model].findMany({ orderBy: { id: 'asc' } });
      const comparable = rows => rows.map(({ updatedAt, ...row }) => row);
      if (JSON.stringify(comparable(before)) !== JSON.stringify(comparable(after))) throw Error('Protected data changed: ' + model);
    }
    console.log(JSON.stringify({ verified: true, preservedUsers: preservedUsers.length, preservedWallets: preservedWallets.length, preservedStores: preservedStores.length }));
  }, { timeout: 60000 });
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
