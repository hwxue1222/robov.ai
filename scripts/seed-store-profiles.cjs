const { PrismaClient } = require('@prisma/client');
const { merchants } = require('../data/merchants.json');
const { merchantFields } = require('../lib/robov/store-profiles');
const db = new PrismaClient();
(async () => {
  if (new URL(process.env.DATABASE_URL).hostname.replace('-pooler', '') !== 'ep-fragrant-field-b3t3ibht.c-4.ap-southeast-1.aws.neon.tech') throw Error('Wrong database');
  let count = 0;
  await db.$transaction(async tx => {
    for (const source of merchants) {
      const data = Object.fromEntries(merchantFields.map(key => [key, source[key] || '']));
      const merchant = await tx.merchant.upsert({ where: { slug: source.id }, create: { ...data, slug: source.id }, update: {} });
      for (const outlet of source.outlets) {
        const store = await tx.store.findUnique({ where: { slug: outlet.id } });
        if (!store) throw Error('Missing existing JWD store');
        const baseline = { merchantId: merchant.id, outletName: outlet.name, city: outlet.city, address: outlet.address, hours: outlet.hours, image: outlet.image, reviewUrl: outlet.reviewUrl, phone: source.phone, email: source.email };
        const patch = Object.fromEntries(Object.entries(baseline).filter(([key]) => store[key] === null));
        if (Object.keys(patch).length) { await tx.store.update({ where: { id: store.id }, data: patch }); count++; }
      }
    }
  });
  console.log(JSON.stringify({ merchants: merchants.length, existingStoreProfilesFilled: count }));
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
