-- Admin review notifications must also support rejected pending checkouts,
-- which intentionally do not create an orders row. Ownership is therefore
-- stored directly and each notification points to either a checkout or order.
ALTER TABLE "public"."notification"
  ADD COLUMN "customer_id" UUID,
  ADD COLUMN "checkout_id" UUID,
  ALTER COLUMN "order_id" DROP NOT NULL;

UPDATE "public"."notification" AS notification
SET "customer_id" = orders."customer_id"
FROM "public"."orders" AS orders
WHERE orders."order_id" = notification."order_id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "public"."notification" WHERE "customer_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot restore notification ownership while orphan notification rows exist.';
  END IF;
END $$;

ALTER TABLE "public"."notification"
  ALTER COLUMN "customer_id" SET NOT NULL,
  ADD CONSTRAINT "notification_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("customer_id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "notification_checkout_id_fkey"
    FOREIGN KEY ("checkout_id") REFERENCES "public"."pending_checkout"("checkout_id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "notification_subject_check"
    CHECK ("order_id" IS NOT NULL OR "checkout_id" IS NOT NULL);

CREATE INDEX "notification_customer_id_is_read_idx"
  ON "public"."notification"("customer_id", "is_read");
CREATE INDEX "notification_checkout_id_idx"
  ON "public"."notification"("checkout_id");
