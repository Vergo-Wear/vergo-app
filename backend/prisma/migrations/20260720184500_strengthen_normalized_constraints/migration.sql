-- Finish the normalized checkout model with strict ownership, lifecycle, and
-- numeric invariants. Every destructive change is guarded by a data preflight.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."profiles" WHERE "role_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require profiles.role_id while unassigned profiles exist.';
  END IF;

  IF EXISTS (SELECT 1 FROM "public"."employee" WHERE "profile_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require employee.profile_id while orphan employees exist.';
  END IF;

  IF EXISTS (
    SELECT "profile_id"
    FROM "public"."employee"
    GROUP BY "profile_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot make employee.profile_id unique while duplicate profile links exist.';
  END IF;

  IF EXISTS (SELECT 1 FROM "public"."product_variant" WHERE "product_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require product_variant.product_id while orphan variants exist.';
  END IF;

  IF EXISTS (SELECT 1 FROM "public"."product" WHERE "base_price" < 0) THEN
    RAISE EXCEPTION 'Cannot enforce product price checks while negative base prices exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."product_variant"
    WHERE "price_adjustment" < 0
  ) THEN
    RAISE EXCEPTION 'Cannot enforce variant price checks while negative adjustments exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."inventory"
    WHERE "quantity" < 0 OR "reorder_level" < 0
  ) THEN
    RAISE EXCEPTION 'Cannot enforce inventory checks while negative quantities exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."order_item"
    WHERE "quantity" <= 0 OR "unit_price" < 0 OR "subtotal" < 0
  ) THEN
    RAISE EXCEPTION 'Cannot enforce order item checks while invalid values exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."pending_checkout"
    WHERE "delivery_fee" < 0
       OR "payment_method" NOT IN ('Bank Transfer', 'Cash on Delivery')
  ) THEN
    RAISE EXCEPTION 'Cannot enforce pending checkout payment and fee checks while invalid values exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."orders"
    WHERE "total_amount" < 0 OR "product_total" < 0 OR "delivery_fee" < 0
       OR "payment_method" NOT IN ('Bank Transfer', 'Cash on Delivery')
       OR "order_status" NOT IN (
         'Ready to Process', 'Claimed', 'Preparing', 'Ready for Pickup',
         'Sent', 'Delivered', 'Cancelled', 'Completed'
       )
  ) THEN
    RAISE EXCEPTION 'Cannot enforce the strict order lifecycle while legacy values exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."review"
    WHERE "rating" < 1 OR "rating" > 5
  ) THEN
    RAISE EXCEPTION 'Cannot enforce review rating checks while ratings outside 1-5 exist.';
  END IF;
END $$;

ALTER TABLE "public"."profiles"
  ALTER COLUMN "role_id" SET NOT NULL;

ALTER TABLE "public"."employee"
  ALTER COLUMN "profile_id" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "employee_profile_id_key"
  ON "public"."employee"("profile_id");

UPDATE "public"."user_addresses"
SET "is_primary" = FALSE
WHERE "is_primary" IS NULL;
UPDATE "public"."user_addresses"
SET "updated_at" = CURRENT_TIMESTAMP
WHERE "updated_at" IS NULL;
ALTER TABLE "public"."user_addresses"
  ALTER COLUMN "is_primary" SET DEFAULT FALSE,
  ALTER COLUMN "is_primary" SET NOT NULL,
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updated_at" SET NOT NULL;
DROP INDEX IF EXISTS "public"."user_addresses_one_primary_per_customer";

UPDATE "public"."cart"
SET "updated_at" = CURRENT_TIMESTAMP
WHERE "updated_at" IS NULL;
ALTER TABLE "public"."cart"
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updated_at" SET NOT NULL;
DROP INDEX IF EXISTS "public"."cart_customer_id_key";
CREATE UNIQUE INDEX "cart_customer_id_key"
  ON "public"."cart"("customer_id");

ALTER TABLE "public"."product_variant"
  ALTER COLUMN "product_id" SET NOT NULL;

ALTER TABLE "public"."pending_checkout"
  DROP CONSTRAINT IF EXISTS "pending_checkout_reviewed_by_fkey";
ALTER TABLE "public"."pending_checkout"
  RENAME COLUMN "reviewed_by" TO "reviewed_by_profile_id";
ALTER TABLE "public"."pending_checkout"
  ADD CONSTRAINT "pending_checkout_reviewed_by_profile_id_fkey"
  FOREIGN KEY ("reviewed_by_profile_id") REFERENCES "public"."profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."orders"
  ALTER COLUMN "order_status" SET DEFAULT 'Ready to Process',
  DROP CONSTRAINT IF EXISTS "valid_order_status",
  DROP CONSTRAINT IF EXISTS "orders_order_status_check",
  DROP CONSTRAINT IF EXISTS "orders_payment_method_check",
  DROP CONSTRAINT IF EXISTS "orders_total_amount_check",
  DROP CONSTRAINT IF EXISTS "orders_product_total_check",
  DROP CONSTRAINT IF EXISTS "orders_delivery_fee_check",
  ADD CONSTRAINT "orders_order_status_check" CHECK (
    "order_status" IN (
      'Ready to Process', 'Claimed', 'Preparing', 'Ready for Pickup',
      'Sent', 'Delivered', 'Cancelled', 'Completed'
    )
  ),
  ADD CONSTRAINT "orders_payment_method_check" CHECK (
    "payment_method" IN ('Bank Transfer', 'Cash on Delivery')
  ),
  ADD CONSTRAINT "orders_total_amount_check" CHECK ("total_amount" >= 0),
  ADD CONSTRAINT "orders_product_total_check" CHECK ("product_total" >= 0),
  ADD CONSTRAINT "orders_delivery_fee_check" CHECK ("delivery_fee" >= 0);

ALTER TABLE "public"."pending_checkout"
  DROP CONSTRAINT IF EXISTS "pending_checkout_payment_method_check",
  DROP CONSTRAINT IF EXISTS "pending_checkout_delivery_fee_check",
  ADD CONSTRAINT "pending_checkout_payment_method_check" CHECK (
    "payment_method" IN ('Bank Transfer', 'Cash on Delivery')
  ),
  ADD CONSTRAINT "pending_checkout_delivery_fee_check" CHECK ("delivery_fee" >= 0);

ALTER TABLE "public"."product"
  DROP CONSTRAINT IF EXISTS "product_base_price_check",
  ADD CONSTRAINT "product_base_price_check" CHECK ("base_price" >= 0);
ALTER TABLE "public"."product_variant"
  DROP CONSTRAINT IF EXISTS "product_variant_price_adjustment_check",
  ADD CONSTRAINT "product_variant_price_adjustment_check" CHECK (
    "price_adjustment" >= 0
  );
ALTER TABLE "public"."inventory"
  DROP CONSTRAINT IF EXISTS "inventory_quantity_check",
  DROP CONSTRAINT IF EXISTS "inventory_reorder_level_check",
  ADD CONSTRAINT "inventory_quantity_check" CHECK ("quantity" >= 0),
  ADD CONSTRAINT "inventory_reorder_level_check" CHECK ("reorder_level" >= 0);
ALTER TABLE "public"."order_item"
  DROP CONSTRAINT IF EXISTS "order_item_quantity_check",
  DROP CONSTRAINT IF EXISTS "order_item_unit_price_check",
  DROP CONSTRAINT IF EXISTS "order_item_subtotal_check",
  ADD CONSTRAINT "order_item_quantity_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "order_item_unit_price_check" CHECK ("unit_price" >= 0),
  ADD CONSTRAINT "order_item_subtotal_check" CHECK ("subtotal" >= 0);
ALTER TABLE "public"."review"
  DROP CONSTRAINT IF EXISTS "review_rating_check",
  ADD CONSTRAINT "review_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

CREATE TABLE "public"."review_image" (
  "review_image_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "review_id" UUID NOT NULL,
  "image_url" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_image_pkey" PRIMARY KEY ("review_image_id"),
  CONSTRAINT "review_image_review_id_fkey"
    FOREIGN KEY ("review_id") REFERENCES "public"."review"("review_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "public"."review_image" ("review_id", "image_url")
SELECT review."review_id", image.value #>> '{}'
FROM "public"."review" AS review
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(review."images") = 'array' THEN review."images"
    ELSE '[]'::jsonb
  END
) AS image(value)
WHERE jsonb_typeof(image.value) = 'string'
  AND NULLIF(BTRIM(image.value #>> '{}'), '') IS NOT NULL;

CREATE INDEX "review_image_review_id_idx"
  ON "public"."review_image"("review_id");
ALTER TABLE "public"."review" DROP COLUMN "images";
