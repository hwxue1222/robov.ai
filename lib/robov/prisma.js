let prisma;

function getPrisma() {
  if (prisma) return prisma;
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient({ transactionOptions: { maxWait: 10000, timeout: 15000 } });
  return prisma;
}

module.exports = { getPrisma };
