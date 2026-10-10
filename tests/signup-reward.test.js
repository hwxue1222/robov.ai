const test = require('node:test');
const assert = require('node:assert/strict');
const { createMember } = require('../lib/robov/signup-reward');
const { requestRedemption } = require('../lib/robov/ledger');
function fixture(settings) {
  let saved, credit, log;
  const tx = {
    rewardSettings: { findUnique: async () => settings },
    rewardActivity: { findMany: async () => [] },
    robovUser: { findUnique: async () => saved, create: async ({ data }) => (saved = { id: 'member', ...data, member: { id: 'wallet', pointBalance: data.member.create.pointBalance } }) },
    pointTransaction: { create: async ({ data }) => (credit = { id: 'credit', ...data }) },
    auditLog: { create: async ({ data }) => (log = data) }
  };
  return { ...tx, $transaction: fn => fn(tx), results: () => ({ saved, credit, log }) };
}
test('signup defaults to 5 points with one opening ledger credit and audit', async () => {
  const db = fixture(null), user = { id: 'auth', email: 'member@example.invalid', name: 'Member' };
  await createMember(db, user);
  const { saved, credit, log } = db.results();
  assert.equal(saved.member.pointBalance,5); assert.equal(saved.role,'MEMBER');
  assert.equal(credit.idempotencyKey,'signup:auth'); assert.equal(credit.metadata.reason,'SIGNUP_BONUS');
  assert.equal(log.targetId,credit.id);
  assert.equal((await createMember(db,user)).id,saved.id);
});
test('admin custom amount or disabled campaign governs new account credit', async () => {
  for (const [enabled, amount, expected] of [[true,150,150],[false,100,0],[true,0,0]]) {
    const db = fixture({ signupEnabled:enabled,signupPoints:amount });
    await createMember(db,{ id:'auth',email:'member@example.invalid',name:'Member' });
    assert.equal(db.results().saved.member.pointBalance,expected);
    assert.equal(Boolean(db.results().credit),expected > 0);
  }
});
test('signup invitation attribution commits with the wallet once and cannot be replaced by later login', async () => {
  const db = fixture(null), user = { id: 'auth', email: 'member@example.invalid', name: 'Member', invitationCodeId: 'invite-one' };
  const member = await createMember(db, user);
  assert.equal(member.invitationCodeId, 'invite-one');
  await createMember(db, { ...user, invitationCodeId: 'invite-two' });
  assert.equal(db.results().saved.invitationCodeId, 'invite-one');
  assert.equal(db.results().saved.member.pointBalance, 5);
});
test('voucher rejects incorrect point amount, low spend, takeaway and combined promotions before writing', async () => {
  const input = { points:5,amount:50,receiptNo:'RCP-123',dineIn:true,otherPromotion:false };
  for (const patch of [{points:100},{amount:49.99},{dineIn:false},{otherPromotion:true}]) await assert.rejects(requestRedemption({}, { ...input,...patch }), /VOUCHER_|没有满足最低消费金额/);
});
test('expired registration activity creates a zero-balance wallet without bonus',async()=>{
  const db=fixture({signupEnabled:true,signupPoints:100,signupEndsAt:'2000-01-01T00:00:00.000Z'});
  await createMember(db,{id:'expired',email:'expired@example.invalid',name:'Expired'});
  assert.equal(db.results().saved.member.pointBalance,0);assert.equal(db.results().credit,undefined);
});
