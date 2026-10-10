const fs=require('node:fs');
const path=require('node:path');
const readline=require('node:readline');
const {getPrisma}=require('../lib/robov/prisma');
(async()=>{
  if(process.env.VERCEL_ENV==='production'||new URL(process.env.DATABASE_URL).hostname.replace('-pooler','')!==process.env.ROBOV_TEST_DATABASE_HOST) throw new Error('EXPLICIT_TEST_DATABASE_REQUIRED');
  if(process.stdin.isTTY)process.stdin.setRawMode(true);
  const rl=readline.createInterface({input:process.stdin,terminal:false});
  const input=await new Promise(resolve=>rl.once('line',resolve));rl.close();
  const entries=JSON.parse(input);
  if(!Array.isArray(entries)||entries.length!==2||new Set(entries.map(e=>e.username)).size!==2) throw new Error('TWO_ADMIN_ACCOUNTS_REQUIRED');
  const {hashPassword}=await import('better-auth/crypto');
  const db=getPrisma();
  try{
    const prepared=[];
    for(const entry of entries){
      if(!['admin','superadmin'].includes(entry.username)||typeof entry.email!=='string'||!entry.email.includes('@')||typeof entry.password!=='string'||entry.password.length<8||!path.isAbsolute(entry.filename)) throw new Error('INVALID_ACCOUNT_CONFIGURATION');
      const user=await db.robovUser.findUnique({where:{username:entry.username}});
      if(!user?.authUserId)throw new Error('EXISTING_ADMIN_REQUIRED');
      const email=entry.email.trim().toLowerCase();
      const conflict=await db.authUser.findUnique({where:{email}});
      const memberConflict=await db.robovUser.findUnique({where:{email}});
      if((conflict&&conflict.id!==user.authUserId)||(memberConflict&&memberConflict.id!==user.id))throw new Error('ACCOUNT_EMAIL_ALREADY_EXISTS');
      const account=await db.authAccount.findFirst({where:{userId:user.authUserId,providerId:'credential'}});
      if(!account)throw new Error('PASSWORD_ACCOUNT_REQUIRED');
      prepared.push({...entry,email,user,account,passwordHash:await hashPassword(entry.password)});
    }
    await db.$transaction(async tx=>{
      for(const e of prepared){
        await tx.authUser.update({where:{id:e.user.authUserId},data:{email:e.email,emailVerified:false}});
        await tx.robovUser.update({where:{id:e.user.id},data:{email:e.email}});
        await tx.authAccount.update({where:{id:e.account.id},data:{password:e.passwordHash}});
        await tx.authSession.deleteMany({where:{userId:e.user.authUserId}});
      }
    });
    for(const e of prepared)fs.writeFileSync(e.filename,`# ROBOV Preview ${e.username}\n\nEmail: ${e.email}\nPassword: ${e.password}\n\nEmployee email sign-in. Test environment only. Existing sessions revoked. Keep private.\n`,{mode:0o600});
    console.log('Two administrator emails and passwords updated in test DB. Previous sessions revoked. Roles and store assignments preserved.');
  }finally{await db.$disconnect();}
})().catch(e=>{console.error(e.code||e.message);process.exitCode=1;});
