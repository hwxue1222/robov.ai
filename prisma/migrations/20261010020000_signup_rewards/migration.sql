ALTER TYPE "AuditAction" ADD VALUE 'REWARD_SETTINGS_UPDATED';
CREATE TABLE "RewardSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "signupEnabled" BOOLEAN NOT NULL DEFAULT true,
  "signupPoints" INTEGER NOT NULL DEFAULT 100 CHECK ("signupPoints" BETWEEN 0 AND 10000),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RewardSettings_pkey" PRIMARY KEY ("id")
);
