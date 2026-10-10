const {activityStatus}=require('./activity-status');
const BUILTINS={registration:{kind:'SIGNUP',title:'注册奖励',pointsKey:'signupPoints',enabledKey:'signupEnabled',dateKey:'signupEndsAt'},voucher:{kind:'VOUCHER',title:'RM5 折扣券',points:100,discountCents:500,minimumSpendCents:5000,enabledKey:'voucherEnabled',dateKey:'voucherEndsAt'},'google-review':{kind:'INTERACTION',title:'Google Review',points:0,enabledKey:'reviewEnabled',dateKey:'reviewEndsAt'}};
const status=row=>activityStatus(row.enabled&&!row.deletedAt,row.endsAt);
function builtinRows(settings){return Object.entries(BUILTINS).map(([id,definition])=>({id,kind:definition.kind,title:definition.title,points:definition.pointsKey?settings[definition.pointsKey]:definition.points,discountCents:definition.discountCents||0,minimumSpendCents:definition.minimumSpendCents||0,storeId:null,enabled:settings[definition.enabledKey]!==false,endsAt:settings[definition.dateKey]||null,builtin:true,version:0}));}
function validateActivity(input){
  if(!['SIGNUP','VOUCHER','INTERACTION'].includes(input.kind)||typeof input.title!=='string'||!input.title.trim()||input.title.length>100||typeof input.enabled!=='boolean'||!Number.isInteger(input.points)||input.points<0||input.points>10000)throw Error('INVALID_ACTIVITY');
  const data={kind:input.kind,title:input.title.trim(),points:input.points,enabled:input.enabled,endsAt:null,url:null,discountCents:0,minimumSpendCents:0};
  if(input.endsAt){const date=require('./activity-status').parseActivityDates({signupEndsAt:input.endsAt}).signupEndsAt;data.endsAt=date;}
  if(input.url){let url;try{url=new URL(input.url);}catch{throw Error('INVALID_ACTIVITY_URL');}if(url.protocol!=='https:'||url.username||url.password||url.href.length>2000)throw Error('INVALID_ACTIVITY_URL');data.url=url.href;}
  if(input.kind==='VOUCHER'){
    if(input.points<1||!Number.isInteger(input.discountCents)||input.discountCents<=0||input.discountCents>1000000||!Number.isInteger(input.minimumSpendCents)||input.minimumSpendCents<input.discountCents||input.minimumSpendCents>100000000)throw Error('INVALID_ACTIVITY');
    data.discountCents=input.discountCents;data.minimumSpendCents=input.minimumSpendCents;
  }
  if(input.kind==='INTERACTION'&&input.points>0){
    const host=data.url?new URL(data.url).hostname:'';
    if(/google.*review|google.*评价|谷歌.*评|ulasan.*google/i.test(data.title)||/(^|\.)(google\.[a-z.]+|goo\.gl|g\.page)$/.test(host))throw Error('GOOGLE_REVIEW_NO_REWARDS');
  }
  return data;
}
async function signupActivities(db){return (await db.rewardActivity.findMany({where:{kind:'SIGNUP',storeId:null,deletedAt:null,enabled:true},orderBy:{createdAt:'asc'}})).filter(row=>status(row)==='ongoing');}
async function registrationOffer(db,settings){const extras=await signupActivities(db);const base=activityStatus(settings.signupEnabled,settings.signupEndsAt)==='ongoing'?settings.signupPoints:0;return {signupEnabled:base>0||extras.some(row=>row.points>0),signupPoints:base+extras.reduce((sum,row)=>sum+row.points,0)};}
module.exports={BUILTINS,status,builtinRows,validateActivity,signupActivities,registrationOffer};
