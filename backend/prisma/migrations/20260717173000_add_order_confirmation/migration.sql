ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "confirmation_status" text NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS "confirmed_by" uuid,
  ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "rejection_reason" text;

ALTER TABLE "public"."orders"
  DROP CONSTRAINT IF EXISTS "orders_confirmation_status_check";

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_confirmation_status_check"
  CHECK ("confirmation_status" IN ('Pending', 'Approved', 'Rejected'));

ALTER TABLE "public"."orders"
  DROP CONSTRAINT IF EXISTS "orders_order_status_check";

-- Older database snapshots used this name for the same status check.
ALTER TABLE "public"."orders"
  DROP CONSTRAINT IF EXISTS "valid_order_status";

UPDATE "public"."orders"
SET "order_status" = 'Pending'
WHERE "order_status" IS NULL OR lower("order_status") = 'pending';

UPDATE "public"."orders"
SET "confirmation_status" = 'Approved',
    "confirmed_at" = COALESCE("confirmed_at", "order_date")
WHERE "order_status" IN (
  'Ready to Process', 'Claimed by Employee', 'Claimed', 'Preparing', 'Ready',
  'Ready for Pickup', 'Sent for Delivery', 'Sent', 'Delivered', 'Completed'
);

UPDATE "public"."orders"
SET "confirmation_status" = 'Rejected'
WHERE "order_status" = 'Rejected';

ALTER TABLE "public"."orders"
  ALTER COLUMN "order_status" SET DEFAULT 'Pending',
  ALTER COLUMN "order_status" SET NOT NULL;

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_order_status_check"
  CHECK ("order_status" IN (
    'Pending', 'Draft', 'Pending Payment', 'Pending Verification', 'Ready to Process',
    'Claimed by Employee', 'Claimed', 'Preparing', 'Ready',
    'Ready for Pickup', 'Sent for Delivery', 'Sent', 'Delivered',
    'Completed', 'Cancelled', 'Rejected', 'Expired'
  ));

ALTER TABLE "public"."orders"
  DROP CONSTRAINT IF EXISTS "orders_confirmed_by_fkey";

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_confirmed_by_fkey"
  FOREIGN KEY ("confirmed_by")
  REFERENCES "public"."employee"("employee_id")
  ON DELETE SET NULL
  ON UPDATE NO ACTION;
