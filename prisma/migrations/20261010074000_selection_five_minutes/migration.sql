UPDATE "MemberSelection" SET "expiresAt" = LEAST("expiresAt", CURRENT_TIMESTAMP + INTERVAL '5 minutes');
