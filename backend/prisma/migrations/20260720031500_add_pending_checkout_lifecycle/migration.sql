CREATE TABLE "public"."pending_checkout" (
  "checkout_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customer_id" UUID,
  "order_id" UUID,
  "reservation_id" UUID,
  "payment_method" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "checkout_payload" JSONB NOT NULL,
  "product_total" DECIMAL NOT NULL,
  "delivery_fee" DECIMAL NOT NULL,
  "total_amount" DECIMAL NOT NULL,
  "receipt_url" TEXT,
  "receipt_uploaded_at" TIMESTAMPTZ(6),
  "expires_at" TIMESTAMPTZ(6),
  "admin_notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pending_checkout_pkey" PRIMARY KEY ("checkout_id"),
  CONSTRAINT "pending_checkout_status_check" CHECK (
    "status" IN (
      'Awaiting Payment',
      'Pending Confirmation',
      'Pending Verification',
      'Approved',
      'Rejected',
      'Cancelled',
      'Expired'
    )
  )
);

CREATE UNIQUE INDEX "pending_checkout_order_id_key"
  ON "public"."pending_checkout"("order_id");

CREATE INDEX "pending_checkout_customer_id_status_idx"
  ON "public"."pending_checkout"("customer_id", "status");

CREATE INDEX "pending_checkout_status_created_at_idx"
  ON "public"."pending_checkout"("status", "created_at");

CREATE UNIQUE INDEX "pending_checkout_one_open_per_customer"
  ON "public"."pending_checkout"("customer_id")
  WHERE "customer_id" IS NOT NULL
    AND "status" IN (
      'Awaiting Payment',
      'Pending Confirmation',
      'Pending Verification'
    );

ALTER TABLE "public"."pending_checkout"
  ADD CONSTRAINT "pending_checkout_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("customer_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."pending_checkout"
  ADD CONSTRAINT "pending_checkout_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id")
  ON DELETE SET NULL ON UPDATE CASCADE;
