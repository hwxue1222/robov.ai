async function canManageStore(db,actor,storeId){
  if(actor.role==='SUPERADMIN')return true;
  if(actor.role!=='ADMIN'||!storeId)return false;
  const assignment=await db.storeStaff.findUnique({where:{storeId_userId:{storeId,userId:actor.id}}});
  return assignment?.active===true&&assignment.role==='ADMIN';
}
async function managedStores(db,actor){
  if(actor.role==='SUPERADMIN')return actor.stores;
  if(actor.role!=='ADMIN')return [];
  const assigned=await db.storeStaff.findMany({where:{userId:actor.id,active:true,role:'ADMIN',store:{active:true}},select:{storeId:true}});
  return actor.stores.filter(store=>assigned.some(row=>row.storeId===store.id));
}
module.exports={canManageStore,managedStores};
