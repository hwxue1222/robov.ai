const merchantFields = ['name', 'nameZh', 'category', 'country', 'region', 'description', 'website', 'phone', 'email', 'logo', 'image', 'sourceUrl'];
const storeFields = ['name', 'outletName', 'city', 'address', 'hours', 'phone', 'email', 'image', 'reviewUrl'];
function requireSuperadmin(actor) { if (actor?.role !== 'SUPERADMIN') throw Error('SUPERADMIN_REQUIRED'); }
function validateProfile(input, kind) {
  const fields = kind === 'merchant' ? merchantFields : storeFields, data = {};
  for (const key of fields) {
    const value = input[key] ?? '';
    const max = ['description', 'address', 'website', 'logo', 'image', 'sourceUrl', 'reviewUrl'].includes(key) ? 2000 : key === 'hours' ? 500 : 254;
    if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw Error('INVALID_STORE_PROFILE');
    data[key] = value.trim();
  }
  if (!data.name || data.name.length > 150) throw Error('INVALID_STORE_PROFILE');
  if (typeof input.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || input.slug.length > 100) throw Error('INVALID_STORE_PROFILE');
  data.slug = input.slug;
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw Error('INVALID_STORE_PROFILE');
  for (const key of ['website', 'sourceUrl', 'logo', 'image']) if (data[key]) {
    if (['logo', 'image'].includes(key) && /^\.\/assets\/[a-zA-Z0-9_./-]+$/.test(data[key]) && !data[key].includes('..')) continue;
    let url; try { url = new URL(data[key]); } catch { throw Error('INVALID_STORE_PROFILE'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw Error('INVALID_STORE_PROFILE');
  }
  if (data.reviewUrl && !require('./rewards').googleReviewUrl(data.reviewUrl)) throw Error('INVALID_STORE_PROFILE');
  if (kind === 'store') {
    if (typeof input.active !== 'boolean' || (input.merchantId && (typeof input.merchantId !== 'string' || input.merchantId.length > 100))) throw Error('INVALID_STORE_PROFILE');
    data.active = input.active; data.merchantId = input.merchantId || null;
  }
  return data;
}
async function saveProfile(db, actor, input) {
  requireSuperadmin(actor);
  if (!['store', 'merchant'].includes(input.kind) || (input.id && (typeof input.id !== 'string' || input.id.length > 100))) throw Error('INVALID_STORE_PROFILE');
  const data = validateProfile(input, input.kind), model = input.kind === 'store' ? 'store' : 'merchant';
  if (input.id && (!Number.isInteger(input.version) || input.version < 1)) throw Error('STORE_PROFILE_CONFLICT');
  return db.$transaction(async tx => {
    if (data.merchantId && !await tx.merchant.findUnique({ where: { id: data.merchantId } })) throw Error('INVALID_STORE_PROFILE');
    const before = input.id ? await tx[model].findUnique({ where: { id: input.id } }) : null;
    if (input.id && (!before || before.slug !== data.slug)) throw Error('STORE_PROFILE_CONFLICT');
    let row;
    if (input.id) {
      const changed = await tx[model].updateMany({ where: { id: input.id, version: input.version }, data: { ...data, version: { increment: 1 } } });
      if (changed.count !== 1) throw Error('STORE_PROFILE_CONFLICT');
      row = await tx[model].findUnique({ where: { id: input.id } });
      if (model === 'store' && !row.active) await tx.memberSelection.deleteMany({ where: { storeId: row.id } });
    } else {
      row = await tx[model].create({ data });
      if (model === 'store') await tx.storeEarnPolicy.create({ data: { storeId: row.id, baseRateBps: 300 } });
    }
    await tx.auditLog.create({ data: { actorUserId: actor.id, ...(model === 'store' ? { storeId: row.id } : {}), action: 'REWARD_SETTINGS_UPDATED', targetType: model === 'store' ? 'Store' : 'Merchant', targetId: row.id, metadata: { operation: before ? 'updated' : 'created', before, after: row } } });
    return row;
  });
}
async function publicMerchants(db) {
  const rows = await db.merchant.findMany({ include: { stores: { where: { active: true }, orderBy: { name: 'asc' } } }, orderBy: { name: 'asc' } });
  return rows.map(({ stores, id, slug, version, createdAt, updatedAt, ...row }) => ({ ...row, id: slug, outlets: stores.map(store => ({ id: store.slug, name: store.outletName || store.name, city: store.city || '', address: store.address || '', hours: store.hours || '', image: store.image || row.image, reviewUrl: store.reviewUrl || '' })) }));
}
module.exports = { merchantFields, storeFields, requireSuperadmin, validateProfile, saveProfile, publicMerchants };
