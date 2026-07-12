ALTER TABLE "public"."employee"
ADD COLUMN IF NOT EXISTS "availability_status" TEXT NOT NULL DEFAULT 'OFF_DUTY';
