-- Finalize the normalized operational schema. Pending checkouts remain the
-- sole owner of pre-approval state; orders are created only after Admin
-- approval and therefore continue to begin at Ready to Process.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "public"."employee"
    WHERE "salary" IS NOT NULL AND "salary" < 0
  ) THEN
    RAISE EXCEPTION 'Cannot enforce employee salary checks while negative salaries exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."salary_record"
    WHERE EXTRACT(DAY FROM "month") <> 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce month-start salary periods while non-month-start values exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."salary_record"
    WHERE "net_salary" <>
      "basic_salary" + "commission_total" + "bonus" - "deduction"
  ) THEN
    RAISE EXCEPTION 'Cannot enforce the salary formula while inconsistent net salaries exist.';
  END IF;

  IF EXISTS (
    SELECT "order_item_id"
    FROM "public"."review"
    GROUP BY "order_item_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot make review.order_item_id unique while duplicate proof links exist.';
  END IF;

  IF EXISTS (
    SELECT "product_id", "size", "color"
    FROM "public"."product_variant"
    GROUP BY "product_id", "size", "color"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot make product size and colour unique while duplicate variants exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."delivery_fee_rules"
    WHERE "fee_amount" < 0
  ) THEN
    RAISE EXCEPTION 'Cannot enforce delivery fees while negative amounts exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."purchase_order"
    WHERE "total_amount" < 0
  ) THEN
    RAISE EXCEPTION 'Cannot enforce purchase order totals while negative amounts exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."purchase_order_item"
    WHERE "quantity" <= 0 OR "cost_price" < 0
  ) THEN
    RAISE EXCEPTION 'Cannot enforce purchase order item amounts while invalid rows exist.';
  END IF;

  IF EXISTS (
    SELECT "purchase_order_id", "variant_id"
    FROM "public"."purchase_order_item"
    GROUP BY "purchase_order_id", "variant_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot make purchase order variants unique while duplicates exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."delivery"
    WHERE "delivery_status" IS NOT NULL
      AND LOWER(BTRIM("delivery_status")) NOT IN (
        'pending', 'submitted', 'in transit', 'delivered',
        'failed', 'returned', 'cancelled'
      )
  ) THEN
    RAISE EXCEPTION 'Cannot normalize delivery statuses while unsupported values exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."pending_checkout" AS checkout
    WHERE checkout."checkout_payload" IS NOT NULL
      AND (
        NOT EXISTS (
          SELECT 1 FROM "public"."pending_checkout_item" AS item
          WHERE item."checkout_id" = checkout."checkout_id"
        )
        OR NOT EXISTS (
          SELECT 1
          FROM "public"."pending_checkout_customer_details" AS details
          WHERE details."checkout_id" = checkout."checkout_id"
        )
        OR NOT EXISTS (
          SELECT 1
          FROM "public"."pending_checkout_shipping_details" AS shipping
          WHERE shipping."checkout_id" = checkout."checkout_id"
        )
      )
  ) THEN
    RAISE EXCEPTION 'Cannot remove checkout JSON while normalized checkout details are incomplete.';
  END IF;
END $$;

ALTER TABLE "public"."employee"
  DROP CONSTRAINT IF EXISTS "employee_salary_check",
  ADD CONSTRAINT "employee_salary_check"
    CHECK ("salary" IS NULL OR "salary" >= 0);

ALTER TABLE "public"."salary_record"
  DROP CONSTRAINT IF EXISTS "salary_record_month_check",
  DROP CONSTRAINT IF EXISTS "salary_record_net_salary_formula_check",
  ADD CONSTRAINT "salary_record_month_check"
    CHECK (EXTRACT(DAY FROM "month") = 1),
  ADD CONSTRAINT "salary_record_net_salary_formula_check" CHECK (
    "net_salary" =
      "basic_salary" + "commission_total" + "bonus" - "deduction"
  );

ALTER TABLE "public"."pending_checkout"
  DROP COLUMN "checkout_payload";

ALTER TABLE "public"."payment_proof"
  DROP CONSTRAINT IF EXISTS "payment_proof_order_id_fkey",
  DROP CONSTRAINT IF EXISTS "payment_proof_order_id_key",
  DROP COLUMN "order_id";

ALTER TABLE "public"."order_customer_details"
  DROP CONSTRAINT IF EXISTS "order_customer_details_customer_type_check",
  DROP COLUMN "customer_type";

ALTER TABLE "public"."delivery"
  DROP CONSTRAINT IF EXISTS "delivery_assigned_employee_id_fkey",
  DROP COLUMN "assigned_employee_id";

UPDATE "public"."delivery"
SET "delivery_status" = CASE LOWER(BTRIM("delivery_status"))
  WHEN 'submitted' THEN 'Submitted'
  WHEN 'in transit' THEN 'In Transit'
  WHEN 'delivered' THEN 'Delivered'
  WHEN 'failed' THEN 'Failed'
  WHEN 'returned' THEN 'Returned'
  WHEN 'cancelled' THEN 'Cancelled'
  ELSE 'Pending'
END;

ALTER TABLE "public"."delivery"
  ALTER COLUMN "delivery_status" SET DEFAULT 'Pending',
  ALTER COLUMN "delivery_status" SET NOT NULL,
  DROP CONSTRAINT IF EXISTS "delivery_status_check",
  ADD CONSTRAINT "delivery_status_check" CHECK (
    "delivery_status" IN (
      'Pending', 'Submitted', 'In Transit', 'Delivered',
      'Failed', 'Returned', 'Cancelled'
    )
  );

ALTER TABLE "public"."review"
  ADD CONSTRAINT "review_order_item_id_key" UNIQUE ("order_item_id");

ALTER TABLE "public"."product_variant"
  ADD CONSTRAINT "product_variant_product_id_size_color_key"
    UNIQUE ("product_id", "size", "color");

ALTER TABLE "public"."employee_commission"
  DROP CONSTRAINT IF EXISTS "employee_commission_paid_check",
  ADD CONSTRAINT "employee_commission_paid_check" CHECK (
    "status" <> 'Paid'
    OR ("salary_id" IS NOT NULL AND "paid_at" IS NOT NULL)
  );

ALTER TABLE "public"."delivery_fee_rules"
  DROP CONSTRAINT IF EXISTS "delivery_fee_rules_amount_check",
  ADD CONSTRAINT "delivery_fee_rules_amount_check"
    CHECK ("fee_amount" >= 0);

ALTER TABLE "public"."purchase_order"
  DROP CONSTRAINT IF EXISTS "purchase_order_total_amount_check",
  ADD CONSTRAINT "purchase_order_total_amount_check"
    CHECK ("total_amount" >= 0);

ALTER TABLE "public"."purchase_order_item"
  DROP CONSTRAINT IF EXISTS "purchase_order_item_quantity_check",
  DROP CONSTRAINT IF EXISTS "purchase_order_item_cost_price_check",
  ADD CONSTRAINT "purchase_order_item_quantity_check"
    CHECK ("quantity" > 0),
  ADD CONSTRAINT "purchase_order_item_cost_price_check"
    CHECK ("cost_price" >= 0),
  ADD CONSTRAINT "purchase_order_item_purchase_order_id_variant_id_key"
    UNIQUE ("purchase_order_id", "variant_id");

COMMENT ON COLUMN "public"."orders"."order_status" IS
  'Orders are created only after Admin approval and begin at Ready to Process. Pre-approval state belongs to pending_checkout.status.';

COMMIT;
