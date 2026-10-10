ALTER TABLE "RewardSettings" ADD COLUMN "voucherEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "RewardSettings" ADD COLUMN "reviewEnabled" BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE "RewardActivity" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storeId" TEXT,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('SIGNUP','VOUCHER','INTERACTION')),
  "title" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0 CHECK ("points" BETWEEN 0 AND 10000),
  "discountCents" INTEGER NOT NULL DEFAULT 0 CHECK ("discountCents" BETWEEN 0 AND 1000000),
  "minimumSpendCents" INTEGER NOT NULL DEFAULT 0 CHECK ("minimumSpendCents" BETWEEN 0 AND 100000000),
  "url" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "endsAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RewardActivity_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RewardActivity_signup_global" CHECK ("kind" != 'SIGNUP' OR "storeId" IS NULL)
);
CREATE INDEX "RewardActivity_storeId_kind_deletedAt_idx" ON "RewardActivity"("storeId","kind","deletedAt");
