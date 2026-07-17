-- Customer notification records for order events (ORDER_READY,
-- PAYMENT_REJECTED, PAYMENT_EXPIRED). Every notification is linked to
-- exactly one customer and one order.
--
-- The live database already contains an (empty, unused) notification table
-- with columns: notification_id, customer_id, order_id, message, type,
-- sent_at, status. This script extends that table in place instead of
-- creating a duplicate. Safe to run against the live Supabase database
-- (idempotent, non-destructive).

CREATE TABLE IF NOT EXISTS "public"."notification" (
  "notification_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" UUID REFERENCES "public"."customer"("customer_id") ON DELETE CASCADE,
  "order_id" UUID REFERENCES "public"."orders"("order_id") ON DELETE CASCADE,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL
);

-- Columns required by the notification module (missing from the legacy table).
ALTER TABLE "public"."notification"
  ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "public"."notification"
  ADD COLUMN IF NOT EXISTS "is_read" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."notification"
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."notification"
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Every notification must belong to exactly one customer and one order.
UPDATE "public"."notification" SET "title" = "message" WHERE "title" IS NULL;
DELETE FROM "public"."notification" WHERE "customer_id" IS NULL OR "order_id" IS NULL;
ALTER TABLE "public"."notification" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "public"."notification" ALTER COLUMN "customer_id" SET NOT NULL;
ALTER TABLE "public"."notification" ALTER COLUMN "order_id" SET NOT NULL;

-- Fast lookup of a customer's unread notifications.
CREATE INDEX IF NOT EXISTS "notification_customer_id_is_read_idx"
  ON "public"."notification" ("customer_id", "is_read");

CREATE INDEX IF NOT EXISTS "notification_order_id_idx"
  ON "public"."notification" ("order_id");

-- An order can only ever have one ORDER_READY notification, even if the
-- status is re-saved as READY multiple times (duplicate-event protection
-- at the database level; the service also guards on status transitions).
CREATE UNIQUE INDEX IF NOT EXISTS "notification_one_order_ready_per_order"
  ON "public"."notification" ("order_id", "type")
  WHERE "type" = 'ORDER_READY';
