ALTER TABLE "AuthUser" ADD COLUMN "employeeStoreId" TEXT;
ALTER TABLE "RobovUser" ADD COLUMN "staffStoreId" TEXT;
ALTER TABLE "AuthUser" ADD CONSTRAINT "AuthUser_employeeStoreId_fkey" FOREIGN KEY ("employeeStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RobovUser" ADD CONSTRAINT "RobovUser_staffStoreId_fkey" FOREIGN KEY ("staffStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE "RobovUser" u SET "staffStoreId" = assigned."storeId"
FROM (SELECT "userId", MIN("storeId") AS "storeId" FROM "StoreStaff" WHERE "active" = true GROUP BY "userId" HAVING COUNT(*) = 1) assigned
WHERE u."id" = assigned."userId" AND u."role" = 'STAFF';
