-- Immutable order snapshots + saved customer addresses support.
-- Safe to run against the live Supabase database (idempotent).

-- 1. Saved address book for registered customers (guest addresses are never stored here).
CREATE TABLE IF NOT EXISTS "public"."user_addresses" (
  "address_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" UUID NOT NULL REFERENCES "public"."customer"("customer_id") ON DELETE CASCADE,
  "receiver_name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address_line_1" TEXT NOT NULL,
  "address_line_2" TEXT,
  "city" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "postal_code" TEXT,
  "is_primary" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

-- The table may already exist without the timestamp columns (see reference.sql).
ALTER TABLE "public"."user_addresses"
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "public"."user_addresses"
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

-- 2. Enforce at most one primary address per customer at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS "user_addresses_one_primary_per_customer"
  ON "public"."user_addresses" ("customer_id")
  WHERE "is_primary" = true;

-- 3. Order snapshot tables: link the customer snapshot back to the customer
--    (nullable — stays null for guests) and add creation timestamps.
ALTER TABLE "public"."order_customer_details"
  ADD COLUMN IF NOT EXISTS "customer_id" UUID;
ALTER TABLE "public"."order_customer_details"
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "public"."order_shipping_details"
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;
