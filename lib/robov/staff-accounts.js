function employeeGrant(actor, role, storeIds, allowedStores) {
  if (!['STAFF', 'ADMIN'].includes(role) || (role === 'ADMIN' && actor.role !== 'SUPERADMIN')) throw new Error('STAFF_FORBIDDEN');
  if (!['ADMIN', 'SUPERADMIN'].includes(actor.role)) throw new Error('STAFF_FORBIDDEN');
  if (!Array.isArray(storeIds) || !storeIds.length || storeIds.length > 100 || storeIds.some(id => typeof id !== 'string' || !allowedStores.some(store => store.id === id)) || new Set(storeIds).size !== storeIds.length || (role === 'STAFF' && storeIds.length !== 1)) throw new Error('STAFF_FORBIDDEN');
  return storeIds;
}
async function createEmployee(db, user, storeId, options = {}) {
  const role = options.role || 'STAFF', storeIds = options.storeIds || [storeId];
  if (!['STAFF', 'ADMIN'].includes(role) || !storeIds.length || (role === 'STAFF' && storeIds.length !== 1)) throw new Error('STAFF_FORBIDDEN');
  try {
    return await db.$transaction(async tx => {
      const existing = await tx.robovUser.findUnique({ where: { authUserId: user.id } });
      if (existing) return existing;
      return tx.robovUser.create({ data: { authUserId: user.id, email: user.email.toLowerCase(), displayName: user.name, role, staffStoreId: role === 'STAFF' ? storeIds[0] : null, staffStores: { create: storeIds.map(id => ({ storeId: id, role, active: true })) } } });
    });
  } catch (error) {
    if (error.code === 'P2002') { const existing = await db.robovUser.findUnique({ where: { authUserId: user.id } }); if (existing) return existing; }
    throw error;
  }
}
function fixedStaffStore(user, storeId) {
  return user?.role !== 'STAFF' || user.staffStoreId === storeId;
}
module.exports = { createEmployee, fixedStaffStore, employeeGrant };
