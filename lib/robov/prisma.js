let prisma;

function getPrisma() {
  if (prisma) return prisma;
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  return prisma;
}

module.exports = { getPrisma };
