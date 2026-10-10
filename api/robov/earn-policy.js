const {requireTestMode}=require('../../lib/robov/config');
const {requireActor}=require('../../lib/robov/auth');
const {getPrisma}=require('../../lib/robov/prisma');
const {getEarnPolicy,validatePolicy}=require('../../lib/robov/earn-policy');

module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!requireTestMode(res))return;
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  try{
    const actor=await requireActor(req,res,true);if(!actor)return;
    const storeId=req.method==='GET'?req.query?.storeId:req.body?.storeId;
    if(typeof storeId!=='string'||!actor.stores.some(s=>s.id===storeId))return res.status(403).json({error:'STAFF_FORBIDDEN'});
    const db=getPrisma();
    const canManage=await require('../../lib/robov/store-admin').canManageStore(db,actor,storeId);
    if(req.method==='GET')return res.status(200).json({policy:await getEarnPolicy(db,storeId),canManage});
    if(!canManage)return res.status(403).json({error:'ADMIN_REQUIRED'});
    const next=validatePolicy(req.body);
    const policy=await db.$transaction(async tx=>{
      const previous=await getEarnPolicy(tx,storeId);
      if(previous.version!==next.version)throw new Error('POLICY_CONFLICT');
      const data={enabled:next.enabled,baseRateBps:next.baseRateBps,tiers:next.tiers,version:next.version+1};
      if(next.version===0)await tx.storeEarnPolicy.create({data:{storeId,...data}});
      else {
        const changed=await tx.storeEarnPolicy.updateMany({where:{storeId,version:next.version},data});
        if(changed.count!==1)throw new Error('POLICY_CONFLICT');
      }
      await tx.auditLog.create({data:{actorUserId:actor.id,storeId,action:'REWARD_SETTINGS_UPDATED',targetType:'StoreEarnPolicy',targetId:storeId,metadata:{previous,...data}}});
      return {...data,storeId};
    });
    return res.status(200).json({policy});
  }catch(error){
    const conflict=error.code==='P2002'||error.message==='POLICY_CONFLICT';
    const validation=['INVALID_EARN_POLICY','OVERLAPPING_AMOUNT_RANGES'].includes(error.message);
    return res.status(conflict?409:validation?400:503).json({error:conflict?'POLICY_CONFLICT':validation?error.message:'POLICY_UNAVAILABLE'});
  }
};
