async function canManageStore(db,actor,storeId){
  if(actor.role==='SUPERADMIN')return true;
  if(actor.role!=='ADMIN'||!storeId)return false;
  const assignment=await db.storeStaff.findUnique({where:{storeId_userId:{storeId,userId:actor.id}}});
  return assignment?.active===true&&assignment.role==='ADMIN';
}
module.exports={canManageStore};
