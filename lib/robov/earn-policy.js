const DEFAULT_POLICY = { enabled:true, baseRateBps:300, tiers:[], version:0 };

function validatePolicy(input) {
  if (typeof input.enabled !== 'boolean' || !Number.isInteger(input.baseRateBps) || input.baseRateBps < 0 || input.baseRateBps > 10000 ||
    !Number.isInteger(input.version) || input.version < 0 || !Array.isArray(input.tiers) || input.tiers.length > 50) throw new Error('INVALID_EARN_POLICY');
  const ids = new Set();
  const tiers = input.tiers.map(tier => {
    if (typeof tier.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(tier.id) || ids.has(tier.id) ||
      !Number.isInteger(tier.minCents) || tier.minCents < 0 || tier.minCents > 100000000 ||
      (tier.maxCents !== null && (!Number.isInteger(tier.maxCents) || tier.maxCents <= tier.minCents || tier.maxCents > 100000000)) ||
      !Number.isInteger(tier.rateBps) || tier.rateBps < 0 || tier.rateBps > 10000) throw new Error('INVALID_EARN_POLICY');
    ids.add(tier.id);
    return {id:tier.id,minCents:tier.minCents,maxCents:tier.maxCents,rateBps:tier.rateBps};
  }).sort((a,b)=>a.minCents-b.minCents);
  for (let i=1;i<tiers.length;i++) if (tiers[i-1].maxCents === null || tiers[i].minCents < tiers[i-1].maxCents) throw new Error('OVERLAPPING_AMOUNT_RANGES');
  return { enabled:input.enabled,baseRateBps:input.baseRateBps,tiers,version:input.version };
}

function rewardForAmount(amountCents, policy=DEFAULT_POLICY) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 100000000) throw new Error('INVALID_AMOUNT');
  if (!policy.enabled) throw new Error('EARN_REWARDS_DISABLED');
  const tier = policy.tiers.find(t=>amountCents>=t.minCents && (t.maxCents===null || amountCents<t.maxCents));
  const rateBps = tier ? tier.rateBps : policy.baseRateBps;
  return { points:Math.floor(amountCents*rateBps/1000000),rateBps,tierId:tier?.id || null,policyVersion:policy.version };
}
async function getEarnPolicy(db,storeId) { return await db.storeEarnPolicy.findUnique({where:{storeId}}) || {...DEFAULT_POLICY,storeId}; }
module.exports = {DEFAULT_POLICY,validatePolicy,rewardForAmount,getEarnPolicy};
