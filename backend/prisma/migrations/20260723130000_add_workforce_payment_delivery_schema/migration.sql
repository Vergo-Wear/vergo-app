-- Add the workforce, payment-proof, delivery, and review invariants required by
-- the approved operational flow. Existing normalized checkout tables remain
-- authoritative; cached totals/payload are maintained for review/reporting.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."attendance"
    WHERE "check_out" IS NOT NULL
      AND "check_in" IS NOT NULL
      AND "check_out" < "check_in"
  ) THEN
    RAISE EXCEPTION 'Cannot enforce attendance times while check-out precedes check-in.';
  END IF;

  IF EXISTS (
    SELECT "employee_id"
    FROM "public"."attendance"
    WHERE "check_in" IS NOT NULL AND "check_out" IS NULL
    GROUP BY "employee_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one open attendance session while duplicate open sessions exist.';
  END IF;

  IF EXISTS (
    SELECT "employee_id", "month"
    FROM "public"."salary_record"
    GROUP BY "employee_id", "month"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one salary record per month while duplicates exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."salary_record"
    WHERE "basic_salary" < 0
       OR COALESCE("bonus", 0) < 0
       OR COALESCE("deduction", 0) < 0
       OR "net_salary" < 0
  ) THEN
    RAISE EXCEPTION 'Cannot enforce salary amount checks while negative values exist.';
  END IF;

  IF EXISTS (
    SELECT "order_id"
    FROM "public"."delivery"
    GROUP BY "order_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one delivery per order while duplicates exist.';
  END IF;
END $$;

ALTER TABLE "public"."profiles"
  ADD COLUMN "last_seen_at" TIMESTAMPTZ(6);

UPDATE "public"."employee"
SET "availability_status" = CASE
  WHEN "availability_status" = 'ACTIVE_DUTY' THEN 'AVAILABLE'
  WHEN "availability_status" = 'ON_BREAK' THEN 'BUSY'
  WHEN "availability_status" IN ('AVAILABLE', 'BUSY', 'OFF_DUTY')
    THEN "availability_status"
  ELSE 'OFF_DUTY'
END;

ALTER TABLE "public"."employee"
  ADD COLUMN "commission_per_parcel" DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN "created_by_profile_id" UUID,
  DROP CONSTRAINT IF EXISTS "employee_availability_status_check",
  ADD CONSTRAINT "employee_commission_per_parcel_check"
    CHECK ("commission_per_parcel" >= 0),
  ADD CONSTRAINT "employee_availability_status_check"
    CHECK ("availability_status" IN ('AVAILABLE', 'BUSY', 'OFF_DUTY')),
  ADD CONSTRAINT "employee_created_by_profile_id_fkey"
    FOREIGN KEY ("created_by_profile_id") REFERENCES "public"."profiles"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."attendance"
  DROP CONSTRAINT IF EXISTS "attendance_time_check",
  DROP CONSTRAINT IF EXISTS "attendance_status_check",
  ADD CONSTRAINT "attendance_time_check" CHECK (
    "check_out" IS NULL OR "check_in" IS NULL OR "check_out" >= "check_in"
  ),
  ADD CONSTRAINT "attendance_status_check" CHECK (
    "status" IS NULL OR "status" IN ('PRESENT', 'LATE', 'ABSENT', 'LEAVE')
  );

CREATE UNIQUE INDEX "employee_one_open_attendance"
  ON "public"."attendance"("employee_id")
  WHERE "check_in" IS NOT NULL AND "check_out" IS NULL;

UPDATE "public"."salary_record"
SET "bonus" = COALESCE("bonus", 0),
    "deduction" = COALESCE("deduction", 0);

ALTER TABLE "public"."salary_record"
  ALTER COLUMN "bonus" SET NOT NULL,
  ALTER COLUMN "deduction" SET NOT NULL,
  ADD COLUMN "commission_total" DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN "payment_status" TEXT NOT NULL DEFAULT 'Pending',
  ADD COLUMN "calculated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "paid_at" TIMESTAMPTZ(6),
  ADD CONSTRAINT "salary_employee_month_unique" UNIQUE ("employee_id", "month"),
  ADD CONSTRAINT "salary_basic_salary_check" CHECK ("basic_salary" >= 0),
  ADD CONSTRAINT "salary_commission_total_check" CHECK ("commission_total" >= 0),
  ADD CONSTRAINT "salary_bonus_check" CHECK ("bonus" >= 0),
  ADD CONSTRAINT "salary_deduction_check" CHECK ("deduction" >= 0),
  ADD CONSTRAINT "salary_net_salary_check" CHECK ("net_salary" >= 0),
  ADD CONSTRAINT "salary_payment_status_check"
    CHECK ("payment_status" IN ('Pending', 'Paid', 'Cancelled'));

ALTER TABLE "public"."supplier"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Active',
  ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD CONSTRAINT "supplier_status_check"
    CHECK ("status" IN ('Active', 'Inactive'));

-- Some hosted environments recorded the checkout-normalization migration
-- after applying an earlier revision of that file. Repair the missing
-- normalized tables here without changing _prisma_migrations.
CREATE TABLE IF NOT EXISTS "public"."pending_checkout_item" (
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
CREATE INDEX IF NOT EXISTS "pending_checkout_item_checkout_id_idx"
  ON "public"."pending_checkout_item"("checkout_id");

CREATE TABLE IF NOT EXISTS "public"."pending_checkout_customer_details" (
  "detail_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "checkout_id" UUID NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  CONSTRAINT "pending_checkout_customer_details_pkey" PRIMARY KEY ("detail_id"),
  CONSTRAINT "pending_checkout_customer_details_checkout_id_key"
    UNIQUE ("checkout_id"),
  CONSTRAINT "pending_checkout_customer_details_checkout_id_fkey"
    FOREIGN KEY ("checkout_id") REFERENCES "public"."pending_checkout"("checkout_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."pending_checkout_shipping_details" (
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
  CONSTRAINT "pending_checkout_shipping_details_checkout_id_key"
    UNIQUE ("checkout_id"),
  CONSTRAINT "pending_checkout_shipping_details_checkout_id_fkey"
    FOREIGN KEY ("checkout_id") REFERENCES "public"."pending_checkout"("checkout_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."checkout_payment_proof" (
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

ALTER TABLE "public"."pending_checkout"
  ADD COLUMN "product_total" DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN "total_amount" DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN "checkout_payload" JSONB,
  ADD CONSTRAINT "pending_checkout_product_total_check"
    CHECK ("product_total" >= 0),
  ADD CONSTRAINT "pending_checkout_total_amount_check"
    CHECK ("total_amount" >= 0);

-- Approved orders contain immutable snapshots and can safely repair their
-- normalized checkout parents. Open legacy headers without payload data stay
-- incomplete so persistOrder rejects approval instead of inventing details.
INSERT INTO "public"."pending_checkout_item"
  ("checkout_id", "variant_id", "quantity", "unit_price")
SELECT orders."checkout_id", item."variant_id",
       SUM(item."quantity")::INTEGER, MAX(item."unit_price")
FROM "public"."orders" AS orders
JOIN "public"."order_item" AS item
  ON item."order_id" = orders."order_id"
GROUP BY orders."checkout_id", item."variant_id"
ON CONFLICT ("checkout_id", "variant_id") DO UPDATE
SET "quantity" = EXCLUDED."quantity",
    "unit_price" = EXCLUDED."unit_price";

INSERT INTO "public"."pending_checkout_customer_details"
  ("checkout_id", "first_name", "last_name", "email", "phone")
SELECT orders."checkout_id", details."first_name", details."last_name",
       details."email", details."phone"
FROM "public"."orders" AS orders
JOIN "public"."order_customer_details" AS details
  ON details."order_id" = orders."order_id"
ON CONFLICT ("checkout_id") DO UPDATE
SET "first_name" = EXCLUDED."first_name",
    "last_name" = EXCLUDED."last_name",
    "email" = EXCLUDED."email",
    "phone" = EXCLUDED."phone";

INSERT INTO "public"."pending_checkout_shipping_details"
  ("checkout_id", "receiver_name", "phone", "address_line_1",
   "address_line_2", "city", "district", "postal_code", "delivery_note")
SELECT orders."checkout_id", details."receiver_name", details."phone",
       details."address_line_1", details."address_line_2", details."city",
       details."district", details."postal_code", details."delivery_note"
FROM "public"."orders" AS orders
JOIN "public"."order_shipping_details" AS details
  ON details."order_id" = orders."order_id"
ON CONFLICT ("checkout_id") DO UPDATE
SET "receiver_name" = EXCLUDED."receiver_name",
    "phone" = EXCLUDED."phone",
    "address_line_1" = EXCLUDED."address_line_1",
    "address_line_2" = EXCLUDED."address_line_2",
    "city" = EXCLUDED."city",
    "district" = EXCLUDED."district",
    "postal_code" = EXCLUDED."postal_code",
    "delivery_note" = EXCLUDED."delivery_note";

WITH totals AS (
  SELECT checkout."checkout_id",
         COALESCE(SUM(item."unit_price" * item."quantity"), 0) AS "product_total"
  FROM "public"."pending_checkout" AS checkout
  LEFT JOIN "public"."pending_checkout_item" AS item
    ON item."checkout_id" = checkout."checkout_id"
  GROUP BY checkout."checkout_id"
)
UPDATE "public"."pending_checkout" AS checkout
SET "product_total" = totals."product_total",
    "total_amount" = totals."product_total" + checkout."delivery_fee"
FROM totals
WHERE checkout."checkout_id" = totals."checkout_id";

WITH payloads AS (
  SELECT checkout."checkout_id",
         jsonb_build_object(
           'paymentMethod',
             CASE WHEN checkout."payment_method" = 'Bank Transfer'
               THEN 'bank_transfer' ELSE 'cod' END,
           'deliveryFee', checkout."delivery_fee",
           'contactDetails', jsonb_build_object(
             'firstName', customer_details."first_name",
             'lastName', customer_details."last_name",
             'email', customer_details."email",
             'phone', customer_details."phone"
           ),
           'shippingDetails', jsonb_build_object(
             'receiverName', shipping."receiver_name",
             'phone', shipping."phone",
             'addressLine1', shipping."address_line_1",
             'addressLine2', shipping."address_line_2",
             'city', shipping."city",
             'district', shipping."district",
             'postalCode', shipping."postal_code",
             'deliveryNote', shipping."delivery_note"
           ),
           'items', COALESCE((
             SELECT jsonb_agg(
               jsonb_build_object(
                 'variantId', item."variant_id",
                 'quantity', item."quantity"
               )
               ORDER BY item."checkout_item_id"
             )
             FROM "public"."pending_checkout_item" AS item
             WHERE item."checkout_id" = checkout."checkout_id"
           ), '[]'::jsonb)
         ) AS "checkout_payload"
  FROM "public"."pending_checkout" AS checkout
  JOIN "public"."pending_checkout_customer_details" AS customer_details
    ON customer_details."checkout_id" = checkout."checkout_id"
  JOIN "public"."pending_checkout_shipping_details" AS shipping
    ON shipping."checkout_id" = checkout."checkout_id"
)
UPDATE "public"."pending_checkout" AS checkout
SET "checkout_payload" = payloads."checkout_payload"
FROM payloads
WHERE payloads."checkout_id" = checkout."checkout_id";

ALTER TABLE "public"."orders"
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "claimed_at" TIMESTAMPTZ(6),
  ADD COLUMN "preparing_at" TIMESTAMPTZ(6),
  ADD COLUMN "parcel_ready_at" TIMESTAMPTZ(6),
  ADD COLUMN "sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "delivered_at" TIMESTAMPTZ(6),
  ADD COLUMN "completed_at" TIMESTAMPTZ(6);

ALTER TABLE "public"."order_customer_details"
  ADD COLUMN "customer_type" TEXT NOT NULL DEFAULT 'registered',
  ADD CONSTRAINT "order_customer_details_customer_type_check"
    CHECK ("customer_type" IN ('registered', 'guest'));

UPDATE "public"."order_customer_details" AS details
SET "customer_type" = CASE
  WHEN orders."customer_id" IS NULL THEN 'guest'
  ELSE 'registered'
END
FROM "public"."orders" AS orders
WHERE orders."order_id" = details."order_id";

ALTER TABLE "public"."delivery"
  ADD COLUMN "courier_name" TEXT NOT NULL DEFAULT 'Koombiyo',
  ADD COLUMN "courier_reference" TEXT,
  ADD COLUMN "waybill_number" TEXT,
  ADD COLUMN "submission_status" TEXT NOT NULL DEFAULT 'Pending',
  ADD COLUMN "submitted_at" TIMESTAMPTZ(6),
  ADD COLUMN "failure_reason" TEXT,
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD CONSTRAINT "delivery_submission_status_check" CHECK (
    "submission_status" IN ('Pending', 'Submitted', 'Failed', 'Cancelled')
  ),
  ADD CONSTRAINT "delivery_order_id_unique" UNIQUE ("order_id");

-- Generalize notification ownership from Customer to Profiles. Guest
-- checkouts still have no recipient and therefore receive no notification row.
ALTER TABLE "public"."notification"
  ADD COLUMN "recipient_profile_id" UUID;

UPDATE "public"."notification" AS notification
SET "recipient_profile_id" = customer."profile_id"
FROM "public"."customer" AS customer
WHERE customer."customer_id" = notification."customer_id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."notification"
    WHERE "recipient_profile_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot migrate notification recipients while orphan customer notifications exist.';
  END IF;
END $$;

ALTER TABLE "public"."notification"
  ALTER COLUMN "recipient_profile_id" SET NOT NULL,
  ADD CONSTRAINT "notification_recipient_profile_id_fkey"
    FOREIGN KEY ("recipient_profile_id") REFERENCES "public"."profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  DROP CONSTRAINT IF EXISTS "notification_subject_check",
  DROP CONSTRAINT IF EXISTS "notification_customer_id_fkey",
  DROP COLUMN "customer_id";

DROP INDEX IF EXISTS "public"."notification_customer_id_is_read_idx";
CREATE INDEX "notification_recipient_profile_id_is_read_idx"
  ON "public"."notification"("recipient_profile_id", "is_read");

-- Tie each existing review to the delivered/completed order item that proved
-- the purchase. Abort if legacy data cannot be proven instead of fabricating it.
ALTER TABLE "public"."review"
  ADD COLUMN "order_item_id" UUID;

WITH purchased AS (
  SELECT review."review_id",
         (
           SELECT item."order_item_id"
           FROM "public"."orders" AS orders
           JOIN "public"."order_item" AS item
             ON item."order_id" = orders."order_id"
           JOIN "public"."product_variant" AS variant
             ON variant."variant_id" = item."variant_id"
           WHERE orders."customer_id" = review."customer_id"
             AND variant."product_id" = review."product_id"
             AND orders."order_status" IN ('Delivered', 'Completed')
           ORDER BY orders."order_date" DESC NULLS LAST, item."order_item_id"
           LIMIT 1
         ) AS "order_item_id"
  FROM "public"."review" AS review
)
UPDATE "public"."review" AS review
SET "order_item_id" = purchased."order_item_id"
FROM purchased
WHERE purchased."review_id" = review."review_id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "public"."review" WHERE "order_item_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot require review.order_item_id while an existing review has no delivered purchase.';
  END IF;
END $$;

ALTER TABLE "public"."review"
  ALTER COLUMN "order_item_id" SET NOT NULL,
  ADD CONSTRAINT "review_order_item_id_fkey"
    FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("order_item_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Upgrade the existing one-proof-per-checkout table into the required
-- payment_proof model without duplicating uploaded receipt records.
ALTER TABLE "public"."checkout_payment_proof"
  RENAME TO "payment_proof";
ALTER TABLE "public"."payment_proof"
  RENAME COLUMN "proof_id" TO "payment_proof_id";
ALTER TABLE "public"."payment_proof"
  RENAME COLUMN "receipt_url" TO "file_url";
ALTER TABLE "public"."payment_proof"
  RENAME CONSTRAINT "checkout_payment_proof_pkey" TO "payment_proof_pkey";
ALTER TABLE "public"."payment_proof"
  RENAME CONSTRAINT "checkout_payment_proof_checkout_id_key"
    TO "payment_proof_checkout_id_key";
ALTER TABLE "public"."payment_proof"
  RENAME CONSTRAINT "checkout_payment_proof_checkout_id_fkey"
    TO "payment_proof_checkout_id_fkey";

ALTER TABLE "public"."payment_proof"
  ADD COLUMN "order_id" UUID,
  ADD COLUMN "file_name" TEXT,
  ADD COLUMN "mime_type" TEXT,
  ADD COLUMN "file_size_bytes" INTEGER,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Pending Verification',
  ADD COLUMN "reviewed_by_profile_id" UUID,
  ADD COLUMN "reviewed_at" TIMESTAMPTZ(6),
  ADD COLUMN "rejection_reason" TEXT,
  ADD CONSTRAINT "payment_proof_file_size_check"
    CHECK ("file_size_bytes" IS NULL OR "file_size_bytes" >= 0),
  ADD CONSTRAINT "payment_proof_status_check" CHECK (
    "status" IN ('Pending Verification', 'Approved', 'Rejected', 'Expired')
  ),
  ADD CONSTRAINT "payment_proof_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "payment_proof_reviewer_fkey"
    FOREIGN KEY ("reviewed_by_profile_id") REFERENCES "public"."profiles"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "payment_proof_order_id_key" UNIQUE ("order_id");

UPDATE "public"."payment_proof" AS proof
SET "order_id" = orders."order_id",
    "status" = CASE
      WHEN checkout."status" = 'Approved' THEN 'Approved'
      WHEN checkout."status" = 'Rejected' THEN 'Rejected'
      WHEN checkout."status" = 'Expired' THEN 'Expired'
      ELSE 'Pending Verification'
    END,
    "reviewed_by_profile_id" = checkout."reviewed_by_profile_id",
    "reviewed_at" = checkout."reviewed_at",
    "rejection_reason" = CASE
      WHEN checkout."status" = 'Rejected' THEN checkout."admin_notes"
      ELSE NULL
    END
FROM "public"."pending_checkout" AS checkout
LEFT JOIN "public"."orders" AS orders
  ON orders."checkout_id" = checkout."checkout_id"
WHERE proof."checkout_id" = checkout."checkout_id";

CREATE TABLE "public"."employee_commission" (
  "commission_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "employee_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "rate_used" DECIMAL NOT NULL,
  "commission_amount" DECIMAL NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Approved',
  "salary_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paid_at" TIMESTAMPTZ(6),
  CONSTRAINT "employee_commission_pkey" PRIMARY KEY ("commission_id"),
  CONSTRAINT "employee_commission_rate_used_check" CHECK ("rate_used" >= 0),
  CONSTRAINT "employee_commission_amount_check"
    CHECK ("commission_amount" >= 0),
  CONSTRAINT "employee_commission_status_check"
    CHECK ("status" IN ('Approved', 'Paid', 'Cancelled')),
  CONSTRAINT "employee_commission_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("employee_id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employee_commission_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employee_commission_salary_id_fkey"
    FOREIGN KEY ("salary_id") REFERENCES "public"."salary_record"("salary_id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "employee_commission_order_id_key" UNIQUE ("order_id")
);

COMMIT;
