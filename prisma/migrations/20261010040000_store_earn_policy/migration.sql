CREATE TABLE "StoreEarnPolicy" (
  "storeId" TEXT NOT NULL PRIMARY KEY,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "baseRateBps" INTEGER NOT NULL DEFAULT 300 CHECK ("baseRateBps" BETWEEN 0 AND 10000),
  "tiers" JSONB NOT NULL DEFAULT '[]',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreEarnPolicy_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StoreEarnPolicy_tiers_array" CHECK (jsonb_typeof("tiers") = 'array')
);
