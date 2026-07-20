-- Normalize checkout, address, receipt, reservation, cart and order ownership.
-- This migration backfills the new structure before removing legacy columns.

-- Preserve legacy customer rows that were never linked to an auth profile.
-- They have no valid account owner and cannot satisfy the normalized required
-- profile relationship. Keeping a database-side archive makes the cleanup
-- recoverable without fabricating auth.users records.
CREATE TABLE IF NOT EXISTS "public"."customer_profile_orphan_archive" (
  "customer_id" UUID PRIMARY KEY,
  "profile_id" UUID,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT NOT NULL,
  "default_shipping_address" TEXT,
  "created_at" TIMESTAMPTZ(6),
  "archived_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "public"."customer_profile_orphan_archive"
  ("customer_id", "profile_id", "first_name", "last_name", "phone", "email",
   "default_shipping_address", "created_at")
SELECT "customer_id", "profile_id", "first_name", "last_name", "phone", "email",
       "default_shipping_address", "created_at"
FROM "public"."customer"
WHERE "profile_id" IS NULL
ON CONFLICT ("customer_id") DO NOTHING;

DELETE FROM "public"."customer" WHERE "profile_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."customer" WHERE "profile_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot normalize customer.profile_id: orphan customer rows must be linked to a profile first.';
  END IF;
  IF EXISTS (
    SELECT "profile_id" FROM "public"."customer"
    GROUP BY "profile_id" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot normalize customer.profile_id: more than one customer is linked to the same profile.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "public"."customer" AS customer
    WHERE NULLIF(BTRIM(customer."default_shipping_address"), '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "public"."user_addresses" AS address
        WHERE address."customer_id" = customer."customer_id"
      )
  ) THEN
    RAISE EXCEPTION 'Cannot remove customer.default_shipping_address without data loss: migrate those values into user_addresses first.';
  END IF;
END $$;

ALTER TABLE "public"."customer"
  ALTER COLUMN "profile_id" SET NOT NULL,
  DROP COLUMN IF EXISTS "default_shipping_address";

CREATE UNIQUE INDEX IF NOT EXISTS "customer_profile_id_key"
  ON "public"."customer"("profile_id");

-- Repair any historical primary-address duplicates deterministically, and make
-- sure a registered customer with saved addresses always has one primary row.
WITH ranked AS (
  SELECT "address_id",
         ROW_NUMBER() OVER (
           PARTITION BY "customer_id"
           ORDER BY "created_at" NULLS LAST, "address_id"
         ) AS row_number
  FROM "public"."user_addresses"
  WHERE "is_primary" IS TRUE
)
UPDATE "public"."user_addresses" AS address
SET "is_primary" = FALSE
FROM ranked
WHERE address."address_id" = ranked."address_id"
  AND ranked.row_number > 1;

WITH first_address AS (
  SELECT DISTINCT ON ("customer_id") "address_id"
  FROM "public"."user_addresses" AS address
  WHERE NOT EXISTS (
    SELECT 1
    FROM "public"."user_addresses" AS primary_address
    WHERE primary_address."customer_id" = address."customer_id"
      AND primary_address."is_primary" IS TRUE
  )
  ORDER BY "customer_id", "created_at" NULLS LAST, "address_id"
)
UPDATE "public"."user_addresses" AS address
SET "is_primary" = TRUE
FROM first_address
WHERE address."address_id" = first_address."address_id";

CREATE UNIQUE INDEX IF NOT EXISTS "one_primary_address_per_customer"
  ON "public"."user_addresses"("customer_id")
  WHERE "is_primary" IS TRUE;

-- Database carts are registered-customer carts. Guest carts remain client-side.
DELETE FROM "public"."cart_item"
WHERE "cart_id" IN (
  SELECT "cart_id" FROM "public"."cart" WHERE "customer_id" IS NULL
);
DELETE FROM "public"."cart" WHERE "customer_id" IS NULL;

DELETE FROM "public"."cart_item"
WHERE "cart_id" IS NULL OR "variant_id" IS NULL;
UPDATE "public"."cart_item" SET "quantity" = 1
WHERE "quantity" IS NULL OR "quantity" <= 0;

WITH ranked AS (
  SELECT "cart_item_id",
         SUM("quantity") OVER (PARTITION BY "cart_id", "variant_id") AS total_quantity,
         ROW_NUMBER() OVER (
           PARTITION BY "cart_id", "variant_id"
           ORDER BY "cart_item_id"
         ) AS row_number
  FROM "public"."cart_item"
)
UPDATE "public"."cart_item" AS item
SET "quantity" = ranked.total_quantity
FROM ranked
WHERE item."cart_item_id" = ranked."cart_item_id"
  AND ranked.row_number = 1;

WITH ranked AS (
  SELECT "cart_item_id",
         ROW_NUMBER() OVER (
           PARTITION BY "cart_id", "variant_id"
           ORDER BY "cart_item_id"
         ) AS row_number
  FROM "public"."cart_item"
)
DELETE FROM "public"."cart_item" AS item
USING ranked
WHERE item."cart_item_id" = ranked."cart_item_id"
  AND ranked.row_number > 1;

ALTER TABLE "public"."cart"
  ALTER COLUMN "customer_id" SET NOT NULL,
  DROP COLUMN IF EXISTS "session_id";
ALTER TABLE "public"."cart_item"
  ALTER COLUMN "cart_id" SET NOT NULL,
  ALTER COLUMN "variant_id" SET NOT NULL,
  ALTER COLUMN "quantity" SET NOT NULL,
  DROP CONSTRAINT IF EXISTS "cart_item_quantity_check",
  ADD CONSTRAINT "cart_item_quantity_check" CHECK ("quantity" > 0);
CREATE UNIQUE INDEX IF NOT EXISTS "cart_item_cart_id_variant_id_key"
  ON "public"."cart_item"("cart_id", "variant_id");

ALTER TABLE "public"."pending_checkout"
  ADD COLUMN IF NOT EXISTS "reviewed_by" UUID,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ(6);

ALTER TABLE "public"."pending_checkout"
  ADD CONSTRAINT "pending_checkout_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "public"."pending_checkout_item" (
  "checkout_item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "checkout_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" DECIMAL NOT NULL,
  CONSTRAINT "pending_checkout_item_pkey" PRIMARY KEY ("checkout_item_id"),
  CONSTRAINT "pending_checkout_item_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "pending_checkout_item_unit_price_check" CHECK ("unit_price" >= 0),
  CONSTRAINT "pending_checkout_item_checkout_id_fkey"
    FOREIGN KEY ("checkout_id") REFERENCES "public"."pending_checkout"("checkout_id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pending_checkout_item_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("variant_id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "pending_checkout_item_checkout_id_variant_id_key"
    UNIQUE ("checkout_id", "variant_id")
);
CREATE INDEX "pending_checkout_item_checkout_id_idx"
  ON "public"."pending_checkout_item"("checkout_id");

CREATE TABLE "public"."pending_checkout_customer_details" (
  "detail_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "checkout_id" UUID NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  CONSTRAINT "pending_checkout_customer_details_pkey" PRIMARY KEY ("detail_id"),
  CONSTRAINT "pending_checkout_customer_details_checkout_id_key" UNIQUE ("checkout_id"),
  CONSTRAINT "pending_checkout_customer_details_checkout_id_fkey"
    FOREIGN KEY ("checkout_id") REFERENCES "public"."pending_checkout"("checkout_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "public"."pending_checkout_shipping_details" (
  "shipping_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "checkout_id" UUID NOT NULL,
  "receiver_name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address_line_1" TEXT NOT NULL,
  "address_line_2" TEXT,
  "city" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "postal_code" TEXT,
  "delivery_note" TEXT,
  CONSTRAINT "pending_checkout_shipping_details_pkey" PRIMARY KEY ("shipping_id"),
  CONSTRAINT "pending_checkout_shipping_details_checkout_id_key" UNIQUE ("checkout_id"),
  CONSTRAINT "pending_checkout_shipping_details_checkout_id_fkey"
    FOREIGN KEY ("checkout_id") REFERENCES "public"."pending_checkout"("checkout_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "public"."checkout_payment_proof" (
  "proof_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "checkout_id" UUID NOT NULL,
  "receipt_url" TEXT NOT NULL,
  "storage_public_id" TEXT,
  "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checkout_payment_proof_pkey" PRIMARY KEY ("proof_id"),
  CONSTRAINT "checkout_payment_proof_checkout_id_key" UNIQUE ("checkout_id"),
  CONSTRAINT "checkout_payment_proof_checkout_id_fkey"
    FOREIGN KEY ("checkout_id") REFERENCES "public"."pending_checkout"("checkout_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill normalized rows from all current pending checkout payloads.
INSERT INTO "public"."pending_checkout_item"
  ("checkout_id", "variant_id", "quantity", "unit_price")
SELECT payload."checkout_id",
       payload."variant_id",
       SUM(payload."quantity")::INTEGER,
       (product."base_price" + COALESCE(variant."price_adjustment", 0))
FROM (
  SELECT checkout."checkout_id",
         (item->>'variantId')::UUID AS "variant_id",
         GREATEST((item->>'quantity')::INTEGER, 1) AS "quantity"
  FROM "public"."pending_checkout" AS checkout
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(checkout."checkout_payload"->'items') = 'array'
      THEN checkout."checkout_payload"->'items'
      ELSE '[]'::jsonb
    END
  ) AS item
  WHERE item ? 'variantId'
) AS payload
JOIN "public"."product_variant" AS variant
  ON variant."variant_id" = payload."variant_id"
JOIN "public"."product" AS product
  ON product."product_id" = variant."product_id"
GROUP BY payload."checkout_id", payload."variant_id", product."base_price", variant."price_adjustment"
ON CONFLICT ("checkout_id", "variant_id") DO NOTHING;

INSERT INTO "public"."pending_checkout_customer_details"
  ("checkout_id", "first_name", "last_name", "email", "phone")
SELECT "checkout_id",
       COALESCE("checkout_payload"#>>'{contactDetails,firstName}', ''),
       COALESCE("checkout_payload"#>>'{contactDetails,lastName}', ''),
       COALESCE("checkout_payload"#>>'{contactDetails,email}', ''),
       COALESCE("checkout_payload"#>>'{contactDetails,phone}', '')
FROM "public"."pending_checkout"
WHERE jsonb_typeof("checkout_payload"->'contactDetails') = 'object'
ON CONFLICT ("checkout_id") DO NOTHING;

INSERT INTO "public"."pending_checkout_shipping_details"
  ("checkout_id", "receiver_name", "phone", "address_line_1", "address_line_2",
   "city", "district", "postal_code", "delivery_note")
SELECT checkout."checkout_id",
       COALESCE(address."receiver_name", checkout."checkout_payload"#>>'{shippingDetails,receiverName}', ''),
       COALESCE(address."phone", checkout."checkout_payload"#>>'{shippingDetails,phone}', ''),
       COALESCE(address."address_line_1", checkout."checkout_payload"#>>'{shippingDetails,addressLine1}', ''),
       COALESCE(address."address_line_2", checkout."checkout_payload"#>>'{shippingDetails,addressLine2}'),
       COALESCE(address."city", checkout."checkout_payload"#>>'{shippingDetails,city}', ''),
       COALESCE(address."district", checkout."checkout_payload"#>>'{shippingDetails,district}', ''),
       COALESCE(address."postal_code", checkout."checkout_payload"#>>'{shippingDetails,postalCode}'),
       checkout."checkout_payload"#>>'{shippingDetails,deliveryNote}'
FROM "public"."pending_checkout" AS checkout
LEFT JOIN "public"."user_addresses" AS address
  ON address."address_id" = NULLIF(checkout."checkout_payload"->>'savedAddressId', '')::UUID
WHERE jsonb_typeof(checkout."checkout_payload"->'shippingDetails') = 'object'
   OR address."address_id" IS NOT NULL
ON CONFLICT ("checkout_id") DO NOTHING;

INSERT INTO "public"."checkout_payment_proof"
  ("checkout_id", "receipt_url", "uploaded_at", "updated_at")
SELECT "checkout_id", "receipt_url",
       COALESCE("receipt_uploaded_at", "updated_at"), "updated_at"
FROM "public"."pending_checkout"
WHERE "receipt_url" IS NOT NULL
ON CONFLICT ("checkout_id") DO UPDATE
SET "receipt_url" = EXCLUDED."receipt_url",
    "uploaded_at" = EXCLUDED."uploaded_at",
    "updated_at" = EXCLUDED."updated_at";

-- Every historical order receives a checkout parent so orders.checkout_id can
-- be required without losing pre-normalization orders.
INSERT INTO "public"."pending_checkout"
  ("checkout_id", "customer_id", "order_id", "payment_method", "status",
   "checkout_payload", "product_total", "delivery_fee", "total_amount",
   "expires_at", "admin_notes", "reviewed_at", "created_at", "updated_at")
SELECT gen_random_uuid(), orders."customer_id", orders."order_id", orders."payment_method", 'Approved',
       '{}'::jsonb, orders."product_total", orders."delivery_fee", orders."total_amount",
       NULL, orders."rejection_reason", COALESCE(orders."confirmed_at", orders."order_date"),
       COALESCE(orders."order_date", CURRENT_TIMESTAMP), COALESCE(orders."confirmed_at", orders."order_date", CURRENT_TIMESTAMP)
FROM "public"."orders" AS orders
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."pending_checkout" AS checkout
  WHERE checkout."order_id" = orders."order_id"
);

ALTER TABLE "public"."orders" ADD COLUMN IF NOT EXISTS "checkout_id" UUID;
UPDATE "public"."orders" AS orders
SET "checkout_id" = checkout."checkout_id"
FROM "public"."pending_checkout" AS checkout
WHERE checkout."order_id" = orders."order_id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."orders" WHERE "checkout_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot normalize orders.checkout_id: an order has no checkout parent.';
  END IF;
END $$;

ALTER TABLE "public"."orders"
  ALTER COLUMN "checkout_id" SET NOT NULL,
  ADD CONSTRAINT "orders_checkout_id_fkey"
    FOREIGN KEY ("checkout_id") REFERENCES "public"."pending_checkout"("checkout_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "orders_checkout_id_key" ON "public"."orders"("checkout_id");

-- Approved orders are the authoritative source for their immutable snapshots.
INSERT INTO "public"."pending_checkout_item"
  ("checkout_id", "variant_id", "quantity", "unit_price")
SELECT orders."checkout_id", item."variant_id", item."quantity", item."unit_price"
FROM "public"."orders" AS orders
JOIN "public"."order_item" AS item ON item."order_id" = orders."order_id"
ON CONFLICT ("checkout_id", "variant_id") DO UPDATE
SET "quantity" = EXCLUDED."quantity", "unit_price" = EXCLUDED."unit_price";

INSERT INTO "public"."pending_checkout_customer_details"
  ("checkout_id", "first_name", "last_name", "email", "phone")
SELECT orders."checkout_id", details."first_name", details."last_name", details."email", details."phone"
FROM "public"."orders" AS orders
JOIN "public"."order_customer_details" AS details ON details."order_id" = orders."order_id"
ON CONFLICT ("checkout_id") DO UPDATE
SET "first_name" = EXCLUDED."first_name", "last_name" = EXCLUDED."last_name",
    "email" = EXCLUDED."email", "phone" = EXCLUDED."phone";

INSERT INTO "public"."pending_checkout_shipping_details"
  ("checkout_id", "receiver_name", "phone", "address_line_1", "address_line_2",
   "city", "district", "postal_code", "delivery_note")
SELECT orders."checkout_id", details."receiver_name", details."phone", details."address_line_1",
       details."address_line_2", details."city", details."district", details."postal_code", details."delivery_note"
FROM "public"."orders" AS orders
JOIN "public"."order_shipping_details" AS details ON details."order_id" = orders."order_id"
ON CONFLICT ("checkout_id") DO UPDATE
SET "receiver_name" = EXCLUDED."receiver_name", "phone" = EXCLUDED."phone",
    "address_line_1" = EXCLUDED."address_line_1", "address_line_2" = EXCLUDED."address_line_2",
    "city" = EXCLUDED."city", "district" = EXCLUDED."district",
    "postal_code" = EXCLUDED."postal_code", "delivery_note" = EXCLUDED."delivery_note";

INSERT INTO "public"."checkout_payment_proof"
  ("checkout_id", "receipt_url", "uploaded_at", "updated_at")
SELECT DISTINCT ON (orders."checkout_id") orders."checkout_id", proof."receipt_url",
       COALESCE(proof."uploaded_at", orders."order_date", CURRENT_TIMESTAMP),
       COALESCE(proof."uploaded_at", orders."order_date", CURRENT_TIMESTAMP)
FROM "public"."payment_proofs" AS proof
JOIN "public"."orders" AS orders ON orders."order_id" = proof."order_id"
WHERE proof."receipt_url" IS NOT NULL
ORDER BY orders."checkout_id", proof."uploaded_at" DESC NULLS LAST, proof."proof_id"
ON CONFLICT ("checkout_id") DO UPDATE
SET "receipt_url" = CASE
      WHEN EXCLUDED."uploaded_at" >= "checkout_payment_proof"."uploaded_at" THEN EXCLUDED."receipt_url"
      ELSE "checkout_payment_proof"."receipt_url" END,
    "uploaded_at" = GREATEST(EXCLUDED."uploaded_at", "checkout_payment_proof"."uploaded_at"),
    "updated_at" = GREATEST(EXCLUDED."updated_at", "checkout_payment_proof"."updated_at");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."pending_checkout" AS checkout
    WHERE checkout."status" IN ('Awaiting Payment', 'Pending Confirmation', 'Pending Verification')
      AND (
        NOT EXISTS (
          SELECT 1 FROM "public"."pending_checkout_item" AS item
          WHERE item."checkout_id" = checkout."checkout_id"
        )
        OR NOT EXISTS (
          SELECT 1 FROM "public"."pending_checkout_customer_details" AS details
          WHERE details."checkout_id" = checkout."checkout_id"
        )
        OR NOT EXISTS (
          SELECT 1 FROM "public"."pending_checkout_shipping_details" AS shipping
          WHERE shipping."checkout_id" = checkout."checkout_id"
        )
      )
  ) THEN
    RAISE EXCEPTION 'Cannot normalize an open pending checkout because its item, customer, or shipping payload is incomplete.';
  END IF;
END $$;

-- Move temporary stock ownership from customer/order fields to checkout.
ALTER TABLE "public"."stock_reservation" ADD COLUMN IF NOT EXISTS "checkout_id" UUID;
UPDATE "public"."stock_reservation" AS reservation
SET "checkout_id" = orders."checkout_id"
FROM "public"."orders" AS orders
WHERE reservation."order_id" = orders."order_id"
  AND reservation."checkout_id" IS NULL;

UPDATE "public"."stock_reservation" AS reservation
SET "checkout_id" = (
  SELECT pending."checkout_id"
  FROM "public"."pending_checkout" AS pending
  WHERE pending."customer_id" = reservation."customer_id"
    AND pending."payment_method" = 'Bank Transfer'
    AND pending."status" IN ('Awaiting Payment', 'Pending Verification')
  ORDER BY
    CASE WHEN pending."reservation_id" = reservation."reservation_id" THEN 0 ELSE 1 END,
    ABS(EXTRACT(EPOCH FROM (pending."expires_at" - reservation."expires_at"))),
    pending."created_at" DESC
  LIMIT 1
)
WHERE reservation."checkout_id" IS NULL;

DELETE FROM "public"."stock_reservation" WHERE "checkout_id" IS NULL;

WITH ranked AS (
  SELECT "reservation_id",
         SUM("quantity") OVER (PARTITION BY "checkout_id", "inventory_id") AS total_quantity,
         MIN("expires_at") OVER (PARTITION BY "checkout_id", "inventory_id") AS earliest_expiry,
         ROW_NUMBER() OVER (
           PARTITION BY "checkout_id", "inventory_id"
           ORDER BY "created_at", "reservation_id"
         ) AS row_number
  FROM "public"."stock_reservation"
)
UPDATE "public"."stock_reservation" AS reservation
SET "quantity" = ranked.total_quantity, "expires_at" = ranked.earliest_expiry
FROM ranked
WHERE reservation."reservation_id" = ranked."reservation_id" AND ranked.row_number = 1;

WITH ranked AS (
  SELECT "reservation_id", ROW_NUMBER() OVER (
    PARTITION BY "checkout_id", "inventory_id" ORDER BY "created_at", "reservation_id"
  ) AS row_number
  FROM "public"."stock_reservation"
)
DELETE FROM "public"."stock_reservation" AS reservation
USING ranked
WHERE reservation."reservation_id" = ranked."reservation_id" AND ranked.row_number > 1;

ALTER TABLE "public"."stock_reservation"
  DROP CONSTRAINT IF EXISTS "stock_reservation_customer_fkey",
  DROP CONSTRAINT IF EXISTS "stock_reservation_customer_id_fkey",
  DROP CONSTRAINT IF EXISTS "stock_reservation_order_fkey",
  DROP CONSTRAINT IF EXISTS "stock_reservation_order_item_fkey",
  DROP CONSTRAINT IF EXISTS "stock_reservation_order_id_fkey",
  DROP CONSTRAINT IF EXISTS "stock_reservation_order_item_id_fkey",
  ALTER COLUMN "checkout_id" SET NOT NULL,
  DROP COLUMN IF EXISTS "customer_id",
  DROP COLUMN IF EXISTS "order_id",
  DROP COLUMN IF EXISTS "order_item_id",
  ADD CONSTRAINT "stock_reservation_checkout_id_fkey"
    FOREIGN KEY ("checkout_id") REFERENCES "public"."pending_checkout"("checkout_id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "stock_reservation_quantity_check" CHECK ("quantity" > 0);

DROP INDEX IF EXISTS "public"."stock_reservation_customer_inventory_active_unique";
DROP INDEX IF EXISTS "public"."stock_reservation_customer_inventory_current_unique";
DROP INDEX IF EXISTS "public"."stock_reservation_customer_id_idx";
DROP INDEX IF EXISTS "public"."stock_reservation_order_id_idx";
DROP INDEX IF EXISTS "public"."stock_reservation_order_item_id_idx";
CREATE UNIQUE INDEX "stock_reservation_checkout_id_inventory_id_key"
  ON "public"."stock_reservation"("checkout_id", "inventory_id");
CREATE INDEX "stock_reservation_checkout_id_idx"
  ON "public"."stock_reservation"("checkout_id");

ALTER TABLE "public"."inventory_commitment"
  DROP CONSTRAINT IF EXISTS "inventory_commitment_order_fkey",
  DROP CONSTRAINT IF EXISTS "inventory_commitment_order_id_fkey",
  DROP COLUMN IF EXISTS "order_id";
DROP INDEX IF EXISTS "public"."inventory_commitment_order_id_idx";
DROP INDEX IF EXISTS "public"."inventory_commitment_order_id_status_idx";
DROP INDEX IF EXISTS "public"."inventory_commitment_order_status_index";
CREATE INDEX IF NOT EXISTS "inventory_commitment_status_idx"
  ON "public"."inventory_commitment"("status");

ALTER TABLE "public"."order_customer_details"
  DROP COLUMN IF EXISTS "customer_id",
  DROP COLUMN IF EXISTS "customer_type";

DROP TABLE "public"."payment_proofs";

ALTER TABLE "public"."pending_checkout"
  DROP CONSTRAINT IF EXISTS "pending_checkout_order_id_fkey",
  DROP COLUMN IF EXISTS "order_id",
  DROP COLUMN IF EXISTS "reservation_id",
  DROP COLUMN IF EXISTS "checkout_payload",
  DROP COLUMN IF EXISTS "product_total",
  DROP COLUMN IF EXISTS "total_amount",
  DROP COLUMN IF EXISTS "receipt_url",
  DROP COLUMN IF EXISTS "receipt_uploaded_at";
DROP INDEX IF EXISTS "public"."pending_checkout_order_id_key";

ALTER TABLE "public"."orders"
  DROP CONSTRAINT IF EXISTS "orders_confirmed_by_fkey",
  DROP CONSTRAINT IF EXISTS "orders_confirmation_status_check",
  DROP COLUMN IF EXISTS "shipping_address",
  DROP COLUMN IF EXISTS "confirmation_status",
  DROP COLUMN IF EXISTS "confirmed_by",
  DROP COLUMN IF EXISTS "confirmed_at",
  DROP COLUMN IF EXISTS "rejection_reason",
  DROP COLUMN IF EXISTS "cod_amount";
