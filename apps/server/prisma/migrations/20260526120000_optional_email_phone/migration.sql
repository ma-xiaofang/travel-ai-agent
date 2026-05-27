-- 注册二选一：email / phone 可空，但至少保留一个
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- 若尚未添加则补齐字段（与 schema 对齐）
DO $$ BEGIN
  CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" "Gender";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "age" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_key" ON "users"("phone");

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_or_phone_check";
ALTER TABLE "users" ADD CONSTRAINT "users_email_or_phone_check"
  CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);
