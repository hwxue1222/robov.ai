async function createEmployee(db, user, storeId) {
  try {
    return await db.$transaction(async tx => {
      const existing = await tx.robovUser.findUnique({ where: { authUserId: user.id } });
      if (existing) return existing;
      return tx.robovUser.create({ data: { authUserId: user.id, email: user.email.toLowerCase(), displayName: user.name, role: 'STAFF', staffStoreId: storeId, staffStores: { create: { storeId, role: 'STAFF', active: true } } } });
    });
  } catch (error) {
    if (error.code === 'P2002') { const existing = await db.robovUser.findUnique({ where: { authUserId: user.id } }); if (existing) return existing; }
    throw error;
  }
}
function fixedStaffStore(user, storeId) {
  return user?.role !== 'STAFF' || user.staffStoreId === storeId;
}
module.exports = { createEmployee, fixedStaffStore };
