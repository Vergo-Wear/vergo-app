-- Apply only the remaining relational invariants. The checkout/cart/order,
-- reservation, commitment, inventory, primary-address, and review uniqueness
-- protections already exist and are intentionally not duplicated here.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."attendance" WHERE "employee_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require attendance.employee_id while orphan rows exist.';
  END IF;
  IF EXISTS (SELECT 1 FROM "public"."salary_record" WHERE "employee_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require salary_record.employee_id while orphan rows exist.';
  END IF;
  IF EXISTS (SELECT 1 FROM "public"."purchase_order" WHERE "supplier_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require purchase_order.supplier_id while orphan rows exist.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "public"."purchase_order_item"
    WHERE "purchase_order_id" IS NULL OR "variant_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot require purchase-order item ownership while orphan rows exist.';
  END IF;
  IF EXISTS (SELECT 1 FROM "public"."images" WHERE "variant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require images.variant_id while orphan rows exist.';
  END IF;
  IF EXISTS (SELECT 1 FROM "public"."delivery" WHERE "order_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require delivery.order_id while orphan rows exist.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "public"."stock_reservation"
    WHERE "status" NOT IN ('Active', 'Pending Verification')
  ) THEN
    RAISE EXCEPTION 'Cannot restrict reservations to active holds while historical status rows exist.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "public"."notification" AS notification
    JOIN "public"."orders" AS orders ON orders."order_id" = notification."order_id"
    WHERE notification."customer_id" IS DISTINCT FROM orders."customer_id"
  ) THEN
    RAISE EXCEPTION 'Cannot derive notification ownership from orders while mismatched customer links exist.';
  END IF;
END $$;

-- Customer values are editable contact details, not duplicated Auth identity.
ALTER TABLE "public"."customer" RENAME COLUMN "email" TO "contact_email";
ALTER TABLE "public"."customer" RENAME COLUMN "phone" TO "contact_phone";
ALTER INDEX "public"."customer_email_key" RENAME TO "customer_contact_email_key";
COMMENT ON COLUMN "public"."customer"."contact_email" IS
  'Customer contact email; authentication identity remains in auth.users.email.';
COMMENT ON COLUMN "public"."customer"."contact_phone" IS
  'Customer contact phone; authentication identity remains in auth.users.phone.';

ALTER TABLE "public"."attendance"
  ALTER COLUMN "employee_id" SET NOT NULL,
  DROP CONSTRAINT IF EXISTS "attendance_employee_id_fkey",
  ADD CONSTRAINT "attendance_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("employee_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."salary_record"
  ALTER COLUMN "employee_id" SET NOT NULL,
  DROP CONSTRAINT IF EXISTS "salary_record_employee_id_fkey",
  ADD CONSTRAINT "salary_record_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("employee_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."purchase_order"
  ALTER COLUMN "supplier_id" SET NOT NULL,
  DROP CONSTRAINT IF EXISTS "purchase_order_supplier_id_fkey",
  ADD CONSTRAINT "purchase_order_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("supplier_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."purchase_order_item"
  ALTER COLUMN "purchase_order_id" SET NOT NULL,
  ALTER COLUMN "variant_id" SET NOT NULL,
  DROP CONSTRAINT IF EXISTS "purchase_order_item_purchase_order_id_fkey",
  DROP CONSTRAINT IF EXISTS "purchase_order_item_variant_id_fkey",
  ADD CONSTRAINT "purchase_order_item_purchase_order_id_fkey"
    FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("purchase_order_id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_order_item_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("variant_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."images"
  ALTER COLUMN "variant_id" SET NOT NULL;

ALTER TABLE "public"."delivery"
  ALTER COLUMN "order_id" SET NOT NULL,
  DROP CONSTRAINT IF EXISTS "delivery_order_id_fkey",
  ADD CONSTRAINT "delivery_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."stock_reservation"
  DROP CONSTRAINT IF EXISTS "stock_reservation_status_check",
  ADD CONSTRAINT "stock_reservation_status_check" CHECK (
    "status" IN ('Active', 'Pending Verification')
  );

-- Every notification in this application is order-scoped. Customer ownership
-- is derived through orders.customer_id so the two links cannot disagree.
ALTER TABLE "public"."notification"
  DROP CONSTRAINT IF EXISTS "notification_customer_id_fkey",
  DROP COLUMN "customer_id";
DROP INDEX IF EXISTS "public"."notification_customer_id_is_read_idx";
CREATE INDEX IF NOT EXISTS "orders_customer_id_idx"
  ON "public"."orders"("customer_id");
