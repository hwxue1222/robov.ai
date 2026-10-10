-- CreateEnum
CREATE TYPE "RobovRole" AS ENUM ('MEMBER', 'STAFF', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PointTransactionType" AS ENUM ('EARN', 'REDEEM_HOLD', 'REDEEM_SETTLE', 'REDEEM_RELEASE', 'REFUND_REVERSAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PointTransactionStatus" AS ENUM ('PENDING_MEMBER_CONFIRMATION', 'POSTED', 'REVERSED', 'VOIDED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('MEMBER_LOGIN', 'QR_ISSUED', 'QR_SCANNED', 'POINTS_EARNED', 'REDEMPTION_REQUESTED', 'REDEMPTION_CONFIRMED', 'REDEMPTION_CANCELLED', 'REFUND_REVERSED', 'STAFF_DENIED');

-- CreateTable
CREATE TABLE "RobovUser" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "displayName" TEXT,
    "role" "RobovRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RobovUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pointBalance" INTEGER NOT NULL DEFAULT 0,
    "pointsOnHold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreStaff" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RobovRole" NOT NULL DEFAULT 'STAFF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "storeId" TEXT,
    "actorUserId" TEXT,
    "type" "PointTransactionType" NOT NULL,
    "status" "PointTransactionStatus" NOT NULL DEFAULT 'POSTED',
    "points" INTEGER NOT NULL,
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'SGD',
    "receiptNo" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "relatedTransactionId" TEXT,
    "memberConfirmedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "memberUserId" TEXT,
    "storeId" TEXT,
    "action" "AuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RobovUser_email_key" ON "RobovUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RobovUser_phone_key" ON "RobovUser"("phone");

-- CreateIndex
CREATE INDEX "RobovUser_role_idx" ON "RobovUser"("role");

-- CreateIndex
CREATE UNIQUE INDEX "MemberWallet_userId_key" ON "MemberWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- CreateIndex
CREATE INDEX "StoreStaff_userId_active_idx" ON "StoreStaff"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "StoreStaff_storeId_userId_key" ON "StoreStaff"("storeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_idempotencyKey_key" ON "PointTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PointTransaction_walletId_createdAt_idx" ON "PointTransaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_relatedTransactionId_idx" ON "PointTransaction"("relatedTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_storeId_receiptNo_type_key" ON "PointTransaction"("storeId", "receiptNo", "type");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_memberUserId_createdAt_idx" ON "AuditLog"("memberUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_storeId_createdAt_idx" ON "AuditLog"("storeId", "createdAt");

-- AddForeignKey
ALTER TABLE "MemberWallet" ADD CONSTRAINT "MemberWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RobovUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreStaff" ADD CONSTRAINT "StoreStaff_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreStaff" ADD CONSTRAINT "StoreStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RobovUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "MemberWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
