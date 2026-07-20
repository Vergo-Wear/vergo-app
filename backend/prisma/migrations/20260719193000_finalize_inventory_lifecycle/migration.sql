-- Temporary reservations belong to a customer before an order exists.
ALTER TABLE "public"."stock_reservation"
  ADD COLUMN IF NOT EXISTS "customer_id" uuid;

UPDATE "public"."stock_reservation" AS reservation
SET "customer_id" = orders."customer_id"
FROM "public"."orders" AS orders
WHERE reservation."order_id" = orders."order_id"
  AND reservation."customer_id" IS NULL;

-- Legacy guest/COD rows and completed hold rows were transient records from
-- the old lifecycle. Only live Bank Transfer holds survive this migration.
DELETE FROM "public"."stock_reservation"
WHERE "customer_id" IS NULL
   OR "expires_at" IS NULL
   OR "status" NOT IN ('Active', 'Pending Verification');

-- The former uniqueness rule was per order item. Collapse any legacy rows
-- that now represent the same customer/inventory hold before adding the new
-- partial uniqueness rule.
WITH ranked AS (
  SELECT
    "reservation_id",
    SUM("quantity") OVER (
      PARTITION BY "customer_id", "inventory_id"
    ) AS total_quantity,
    MIN("expires_at") OVER (
      PARTITION BY "customer_id", "inventory_id"
    ) AS earliest_expiry,
    ROW_NUMBER() OVER (
      PARTITION BY "customer_id", "inventory_id"
      ORDER BY "created_at", "reservation_id"
    ) AS row_number
  FROM "public"."stock_reservation"
  WHERE "status" IN ('Active', 'Pending Verification')
)
UPDATE "public"."stock_reservation" AS reservation
SET "quantity" = ranked.total_quantity,
    "expires_at" = ranked.earliest_expiry
FROM ranked
WHERE reservation."reservation_id" = ranked."reservation_id"
  AND ranked.row_number = 1;

WITH ranked AS (
  SELECT
    "reservation_id",
    ROW_NUMBER() OVER (
      PARTITION BY "customer_id", "inventory_id"
      ORDER BY "created_at", "reservation_id"
    ) AS row_number
  FROM "public"."stock_reservation"
  WHERE "status" IN ('Active', 'Pending Verification')
)
DELETE FROM "public"."stock_reservation" AS reservation
USING ranked
WHERE reservation."reservation_id" = ranked."reservation_id"
  AND ranked.row_number > 1;

ALTER TABLE "public"."stock_reservation"
  ALTER COLUMN "customer_id" SET NOT NULL,
  ALTER COLUMN "order_id" DROP NOT NULL,
  ALTER COLUMN "order_item_id" DROP NOT NULL,
  ALTER COLUMN "expires_at" SET NOT NULL,
  DROP COLUMN IF EXISTS "confirmed_at",
  DROP COLUMN IF EXISTS "released_at",
  DROP COLUMN IF EXISTS "release_reason";

ALTER TABLE "public"."stock_reservation"
  DROP CONSTRAINT IF EXISTS "stock_reservation_status_check",
  ADD CONSTRAINT "stock_reservation_status_check"
    CHECK ("status" IN ('Active', 'Pending Verification', 'Confirmed', 'Released', 'Expired')),
  DROP CONSTRAINT IF EXISTS "stock_reservation_order_item_inventory_unique",
  ADD CONSTRAINT "stock_reservation_customer_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("customer_id");

DROP INDEX IF EXISTS "public"."stock_reservation_order_id_status_idx";
DROP INDEX IF EXISTS "public"."stock_reservation_order_item_id_idx";

CREATE UNIQUE INDEX "stock_reservation_customer_inventory_current_unique"
  ON "public"."stock_reservation" ("customer_id", "inventory_id")
  WHERE "status" IN ('Active', 'Pending Verification');
CREATE INDEX "stock_reservation_customer_id_idx"
  ON "public"."stock_reservation" ("customer_id");
CREATE INDEX "stock_reservation_order_id_idx"
  ON "public"."stock_reservation" ("order_id");
CREATE INDEX "stock_reservation_order_item_id_idx"
  ON "public"."stock_reservation" ("order_item_id");
CREATE INDEX "stock_reservation_inventory_id_idx"
  ON "public"."stock_reservation" ("inventory_id");

-- Permanent commitments identify the exact order item and inventory source.
ALTER TABLE "public"."inventory_commitment"
  ADD COLUMN IF NOT EXISTS "order_item_id" uuid,
  ADD COLUMN IF NOT EXISTS "restore_reason" text;

UPDATE "public"."inventory_commitment" AS commitment
SET "order_item_id" = (
  SELECT item."order_item_id"
  FROM "public"."order_item" AS item
  JOIN "public"."inventory" AS inventory
    ON inventory."inventory_id" = commitment."inventory_id"
   AND inventory."variant_id" = item."variant_id"
  WHERE item."order_id" = commitment."order_id"
  ORDER BY item."order_item_id"
  LIMIT 1
)
WHERE commitment."order_item_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "public"."inventory_commitment"
    WHERE "order_item_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot attach existing inventory commitments to an order item.';
  END IF;
END $$;

ALTER TABLE "public"."inventory_commitment"
  ALTER COLUMN "order_item_id" SET NOT NULL,
  DROP CONSTRAINT IF EXISTS "inventory_commitment_order_inventory_unique",
  ADD CONSTRAINT "inventory_commitment_order_item_fkey"
    FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("order_item_id"),
  ADD CONSTRAINT "inventory_commitment_order_item_inventory_unique"
    UNIQUE ("order_item_id", "inventory_id");
