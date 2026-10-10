ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEMBER_INVITED';
CREATE TABLE "InvitationCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "rateBps" INTEGER NOT NULL DEFAULT 500 CHECK ("rateBps" BETWEEN 0 AND 10000),
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "rewardEnabled" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvitationCode_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InvitationCode_code_key" ON "InvitationCode"("code");
CREATE INDEX "InvitationCode_storeId_createdAt_idx" ON "InvitationCode"("storeId", "createdAt");
ALTER TABLE "RobovUser" ADD COLUMN "invitationCodeId" TEXT;
ALTER TABLE "AuthUser" ADD COLUMN "invitationCodeId" TEXT;
ALTER TABLE "RobovUser" ADD CONSTRAINT "RobovUser_invitationCodeId_fkey" FOREIGN KEY ("invitationCodeId") REFERENCES "InvitationCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuthUser" ADD CONSTRAINT "AuthUser_invitationCodeId_fkey" FOREIGN KEY ("invitationCodeId") REFERENCES "InvitationCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "RobovUser_invitationCodeId_createdAt_idx" ON "RobovUser"("invitationCodeId", "createdAt");
