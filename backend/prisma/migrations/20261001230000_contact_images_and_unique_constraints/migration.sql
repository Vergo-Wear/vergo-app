-- DropTable
DROP TABLE IF EXISTS "public"."contact_message" CASCADE;

-- AlterTable
ALTER TABLE "public"."images" DROP COLUMN IF EXISTS "title";

-- CreateIndex / Constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_profile_id_key') THEN
        ALTER TABLE "public"."customer" ADD CONSTRAINT "customer_profile_id_key" UNIQUE ("profile_id");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_profile_id_key') THEN
        ALTER TABLE "public"."employee" ADD CONSTRAINT "employee_profile_id_key" UNIQUE ("profile_id");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_email_key') THEN
        ALTER TABLE "public"."supplier" ADD CONSTRAINT "supplier_email_key" UNIQUE ("email");
    END IF;
END $$;
