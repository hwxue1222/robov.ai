const {requireTestMode}=require('../../lib/robov/config');const {requireActor}=require('../../lib/robov/auth');const {getPrisma}=require('../../lib/robov/prisma');
const {BUILTINS,builtinRows,validateActivity,status}=require('../../lib/robov/activities');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');if(!requireTestMode(res))return;
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  try{
    const actor=await requireActor(req,res,true);if(!actor)return;
    const query=new URL(req.url||'/','https://robov.ai').searchParams;
    const requested=req.method==='GET'?query.get('storeId'):req.body?.storeId;
    const storeId=requested==='global'?null:requested;
    if(storeId!==null&&(typeof storeId!=='string'||!actor.stores.some(s=>s.id===storeId)))return res.status(403).json({error:'STAFF_FORBIDDEN'});
    const db=getPrisma();
    const canManage=await require('../../lib/robov/store-admin').canManageStore(db,actor,storeId);
    if(req.method==='GET'){
      const settings=await require('../../lib/robov/signup-reward').rewardSettings(db);
      const rows=[...builtinRows(settings),...await db.rewardActivity.findMany({where:{...(query.get('includeArchived')==='true'?{}:{deletedAt:null}),OR:[{storeId:null},...(storeId?[{storeId}]:[])]},orderBy:{createdAt:'desc'},take:200})];
      return res.status(200).json({canManageStore:canManage,activities:rows.map(row=>({...row,status:status(row),canManage:actor.role==='SUPERADMIN'||(canManage&&row.storeId===storeId&&storeId!==null)}))});
    }
    if(!canManage)return res.status(403).json({error:'ADMIN_REQUIRED'});
    const {action,id,version}=req.body||{};if(!['create','update','archive','restore'].includes(action))throw Error('INVALID_ACTIVITY');
    if(action!=='create'&&typeof id!=='string')throw Error('INVALID_ACTIVITY');
    let data;if(['create','update'].includes(action)&&!Object.hasOwn(BUILTINS,id))data=validateActivity(req.body);
    if(data?.kind==='SIGNUP'&&storeId!==null)throw Error('SIGNUP_REQUIRES_GLOBAL');
    const activity=await db.$transaction(async tx=>{
      let previous,updated;
      if(Object.hasOwn(BUILTINS,id)){
        if(actor.role!=='SUPERADMIN'||storeId!==null||action==='create')throw Error('ADMIN_REQUIRED');
        const definition=BUILTINS[id],settings=await require('../../lib/robov/signup-reward').rewardSettings(tx);previous=builtinRows(settings).find(row=>row.id===id);
        const patch={};patch[definition.enabledKey]=action==='archive'?false:action==='restore'?true:req.body.enabled;
        if(typeof patch[definition.enabledKey]!=='boolean')throw Error('INVALID_ACTIVITY');
        if(action==='update'){
          const dates=require('../../lib/robov/activity-status').parseActivityDates({[definition.dateKey]:req.body.endsAt||null});Object.assign(patch,dates);
          if(id==='registration'){if(!Number.isInteger(req.body.points)||req.body.points<0||req.body.points>10000)throw Error('INVALID_ACTIVITY');patch.signupPoints=req.body.points;}
        }
        const next=await tx.rewardSettings.upsert({where:{id:'default'},create:{id:'default',...patch},update:patch});updated=builtinRows(next).find(row=>row.id===id);
      }else if(action==='create'){
        if(await tx.rewardActivity.count({where:{storeId,deletedAt:null}})>=50)throw Error('INVALID_ACTIVITY_LIMIT');
        updated=await tx.rewardActivity.create({data:{...data,storeId}});
      }else{
        previous=await tx.rewardActivity.findUnique({where:{id}});if(!previous||previous.storeId!==storeId)throw Error('ADMIN_REQUIRED');
        if(!Number.isInteger(version)||version!==previous.version)throw Error('ACTIVITY_CONFLICT');
        const patch=action==='archive'?{deletedAt:new Date(),enabled:false}:action==='restore'?{deletedAt:null,enabled:true}:data;
        if(action==='update'&&previous.deletedAt)throw Error('ACTIVITY_ARCHIVED');
        const changed=await tx.rewardActivity.updateMany({where:{id,version},data:{...patch,version:version+1}});if(changed.count!==1)throw Error('ACTIVITY_CONFLICT');
        updated=await tx.rewardActivity.findUnique({where:{id}});
      }
      await tx.auditLog.create({data:{actorUserId:actor.id,storeId,action:'REWARD_SETTINGS_UPDATED',targetType:'RewardActivity',targetId:updated.id,metadata:{action,previous:previous||null,updated}}});return updated;
    });return res.status(200).json({activity});
  }catch(error){const denied=error.message==='ADMIN_REQUIRED';const conflict=error.message==='ACTIVITY_CONFLICT';const invalid=/^(INVALID_|SIGNUP_REQUIRES_GLOBAL|GOOGLE_REVIEW_NO_REWARDS|ACTIVITY_ARCHIVED)/.test(error.message);return res.status(denied?403:conflict?409:invalid?400:503).json({error:denied||conflict||invalid?error.message:'ACTIVITIES_UNAVAILABLE'});}
};
