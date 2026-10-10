CREATE TABLE "MemberSelection" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "proofHash" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberSelection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MemberSelection_tokenHash_key" ON "MemberSelection"("tokenHash");
CREATE UNIQUE INDEX "MemberSelection_actorUserId_proofHash_key" ON "MemberSelection"("actorUserId", "proofHash");
CREATE INDEX "MemberSelection_expiresAt_idx" ON "MemberSelection"("expiresAt");
