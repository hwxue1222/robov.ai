const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { getPrisma } = require('../lib/robov/prisma');
const { getAuth, ensureRobovUser } = require('../lib/robov/auth');
(async () => {
  if (process.env.VERCEL_ENV === 'production' || new URL(process.env.DATABASE_URL).hostname.replace('-pooler', '') !== process.env.ROBOV_TEST_DATABASE_HOST) throw new Error('EXPLICIT_TEST_DATABASE_REQUIRED');
  const filename = process.env.ROBOV_SUPERADMIN_CREDENTIAL_FILE;
  if (!filename || !path.isAbsolute(filename)) throw new Error('ABSOLUTE_CREDENTIAL_FILE_REQUIRED');
  const db = getPrisma();
  try {
    const admin = await db.robovUser.findUnique({ where: { username: 'admin' } });
    if (!admin) throw new Error('ADMIN_REQUIRED');
    const outlets = require('../data/merchants.json').merchants[0].outlets;
    const stores = await db.store.findMany({ where: { slug: { in: outlets.map(outlet => outlet.id) } } });
    if (stores.length !== 3) throw new Error('THREE_JWD_STORES_REQUIRED');
    await db.$transaction(async tx => {
      await tx.robovUser.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
      await tx.storeStaff.updateMany({ where: { userId: admin.id, storeId: { notIn: stores.map(store => store.id) } }, data: { active: false } });
      for (const store of stores) await tx.storeStaff.upsert({ where: { storeId_userId: { storeId: store.id, userId: admin.id } }, create: { storeId: store.id, userId: admin.id, role: 'ADMIN' }, update: { role: 'ADMIN', active: true } });
    });
    const existing = await db.robovUser.findUnique({ where: { username: 'superadmin' } });
    if (existing) {
      if (existing.role !== 'SUPERADMIN' || !fs.existsSync(filename)) throw new Error('EXISTING_SUPERADMIN_REQUIRES_REVIEW');
      console.log('Existing superadmin preserved; admin scoped to the three JWD stores.'); return;
    }
    if (fs.existsSync(filename)) throw new Error('CREDENTIAL_FILE_EXISTS');
    const password = crypto.randomBytes(24).toString('base64url');
    const result = await (await getAuth()).api.signUpEmail({ body: { email:`superadmin-${crypto.randomUUID()}@accounts.robov.invalid`,name:'ROBOV Super Administrator',password } });
    const member = await ensureRobovUser(result.user);
    await db.robovUser.update({ where: { id: member.id }, data: { role: 'SUPERADMIN', username:'superadmin' } });
    fs.writeFileSync(filename, `# ROBOV Preview Superadmin\n\nUsername: superadmin\nPassword: ${password}\n\nEmployee sign-in. All stores, member activity and global reward settings. Test environment only. Keep private.\n`, { mode:0o600,flag:'wx' });
    console.log('Superadmin created; credentials saved locally. Admin password unchanged; restricted to three JWD stores.');
  } finally { await db.$disconnect(); }
})().catch(error => { console.error(error.code || error.message);process.exitCode=1; });
