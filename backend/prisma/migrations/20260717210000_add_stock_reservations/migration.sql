UPDATE "public"."inventory"
SET "quantity" = COALESCE("quantity", 0),
    "reserved_quantity" = COALESCE("reserved_quantity", 0);

-- Existing unlinked inventory/order items must be corrected deliberately;
-- this migration never fabricates ownership or assigns a branch automatically.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."inventory"
    WHERE "variant_id" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce inventory variant_id requirement while unlinked inventory rows exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."order_item"
    WHERE "order_id" IS NULL OR "variant_id" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce order_item order_id/variant_id requirements while unlinked order items exist.';
  END IF;
END $$;

ALTER TABLE "public"."inventory"
  ALTER COLUMN "quantity" SET NOT NULL,
  ALTER COLUMN "reserved_quantity" SET NOT NULL,
  ALTER COLUMN "variant_id" SET NOT NULL;

ALTER TABLE "public"."order_item"
  ALTER COLUMN "order_id" SET NOT NULL,
  ALTER COLUMN "variant_id" SET NOT NULL;

ALTER TABLE "public"."inventory"
  DROP CONSTRAINT IF EXISTS "inventory_reserved_not_above_quantity",
  ADD CONSTRAINT "inventory_reserved_not_above_quantity"
    CHECK ("reserved_quantity" >= 0 AND "reserved_quantity" <= "quantity");

ALTER TABLE "public"."inventory"
  DROP CONSTRAINT IF EXISTS "inventory_variant_branch_unique",
  ADD CONSTRAINT "inventory_variant_branch_unique" UNIQUE ("variant_id", "branch_id");

CREATE TABLE "public"."stock_reservation" (
  "reservation_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL,
  "order_item_id" uuid NOT NULL,
  "inventory_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'Active',
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "confirmed_at" timestamp with time zone,
  "released_at" timestamp with time zone,
  "release_reason" text,
  CONSTRAINT "stock_reservation_pkey" PRIMARY KEY ("reservation_id"),
  CONSTRAINT "stock_reservation_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "stock_reservation_status_check"
    CHECK ("status" IN ('Active', 'Confirmed', 'Released', 'Expired')),
  CONSTRAINT "stock_reservation_order_fkey"
    FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id"),
  CONSTRAINT "stock_reservation_order_item_fkey"
    FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("order_item_id"),
  CONSTRAINT "stock_reservation_inventory_fkey"
    FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("inventory_id")
);

CREATE INDEX "stock_reservation_order_id_status_idx"
  ON "public"."stock_reservation" ("order_id", "status");

CREATE INDEX "stock_reservation_order_item_id_idx"
  ON "public"."stock_reservation" ("order_item_id");

CREATE INDEX "stock_reservation_expiry_index"
  ON "public"."stock_reservation" ("expires_at", "status");

-- An order item can be allocated across multiple branch inventory rows, but
-- it must not create the same allocation twice.
ALTER TABLE "public"."stock_reservation"
  ADD CONSTRAINT "stock_reservation_order_item_inventory_unique"
  UNIQUE ("order_item_id", "inventory_id");

-- The application keeps one receipt-upload lifecycle per bank-transfer order.
-- This prevents duplicate proof records during concurrent checkout requests.
ALTER TABLE "public"."payment_proofs"
  ADD CONSTRAINT "payment_proofs_order_unique"
  UNIQUE ("order_id");
