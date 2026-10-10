const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { getPrisma } = require('../lib/robov/prisma');
const { getAuth, ensureRobovUser } = require('../lib/robov/auth');

(async () => {
  const host = new URL(process.env.DATABASE_URL).hostname.replace('-pooler', '');
  if (process.env.VERCEL_ENV === 'production' || host !== process.env.ROBOV_TEST_DATABASE_HOST) throw new Error('EXPLICIT_TEST_DATABASE_REQUIRED');
  const db = getPrisma();
  try {
    for (const outlet of require('../data/merchants.json').merchants[0].outlets) await db.store.upsert({ where: { slug: outlet.id }, update: {}, create: { slug: outlet.id, name: `JWD Mee Tarik / ${outlet.name}` } });
    const filename = process.env.ROBOV_ADMIN_CREDENTIAL_FILE;
    if (!filename || !path.isAbsolute(filename)) throw new Error('ABSOLUTE_CREDENTIAL_FILE_REQUIRED');
    const existing = await db.robovUser.findUnique({ where: { username: 'admin' } });
    if (existing) { if (!fs.existsSync(filename)) throw new Error('ADMIN_EXISTS_NO_PASSWORD_RESET'); console.log('Existing admin preserved.'); return; }
    if (fs.existsSync(filename)) throw new Error('CREDENTIAL_FILE_EXISTS');
    const password = crypto.randomBytes(24).toString('base64url');
    const result = await (await getAuth()).api.signUpEmail({ body: { name: 'ROBOV Administrator', email: 'admin@accounts.robov.invalid', password } });
    const member = await ensureRobovUser(result.user);
    await db.robovUser.update({ where: { id: member.id }, data: { username: 'admin', role: 'ADMIN' } });
    fs.writeFileSync(filename, `# ROBOV Preview Admin\n\nUsername: admin\nPassword: ${password}\n\nEmployee sign-in only. Test environment. Keep this file private.\n`, { mode: 0o600, flag: 'wx' });
    console.log('Admin created. Password saved only in the protected local credential file.');
  } finally { await db.$disconnect(); }
})().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
