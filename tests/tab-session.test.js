const test=require('node:test'),assert=require('node:assert/strict');const {tabProof,validTabProof}=require('../lib/robov/tab-session');
test('tab proof is bound to the server session and rejects absent, forged or malformed values',()=>{
  const old=process.env.BETTER_AUTH_SECRET;process.env.BETTER_AUTH_SECRET='test-secret-that-is-at-least-32-characters';
  try{const proof=tabProof('session-one');assert(validTabProof('session-one',proof));assert(!validTabProof('session-two',proof));for(const value of[undefined,'x','é'.repeat(43),'x'.repeat(43)])assert(!validTabProof('session-one',value));}
  finally{if(old===undefined)delete process.env.BETTER_AUTH_SECRET;else process.env.BETTER_AUTH_SECRET=old;}
});
