-- A cart/payment session is exclusive only while a Bank Transfer is awaiting
-- its receipt. Once a checkout is submitted for admin review, the customer can
-- complete another cart and create another independent pending checkout.
DROP INDEX IF EXISTS "public"."pending_checkout_one_open_per_customer";

CREATE UNIQUE INDEX "pending_checkout_one_active_payment_per_customer"
  ON "public"."pending_checkout"("customer_id")
  WHERE "customer_id" IS NOT NULL
    AND "status" = 'Awaiting Payment';

-- Pending Verification reservations belong to completed checkout submissions.
-- Keep only the unfinished Active payment hold exclusive; submitted receipts
-- may coexist until an admin approves or rejects each checkout.
DROP INDEX IF EXISTS "public"."stock_reservation_customer_inventory_current_unique";

CREATE UNIQUE INDEX "stock_reservation_customer_inventory_active_unique"
  ON "public"."stock_reservation"("customer_id", "inventory_id")
  WHERE "status" = 'Active';
