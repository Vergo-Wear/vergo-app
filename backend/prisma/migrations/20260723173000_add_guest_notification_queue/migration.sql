-- Add guest-capable notification queue metadata and the last missing
-- operational constraints. Orders remain approval-created records; pending
-- checkout state is not duplicated into orders.order_status.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT "order_id", "variant_id"
    FROM "public"."order_item"
    GROUP BY "order_id", "variant_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot make order variants unique while duplicate order items exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."salary_record"
    WHERE "payment_status" = 'Paid' AND "paid_at" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot enforce paid salary timestamps while incomplete paid records exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."delivery"
    WHERE "delivery_status" NOT IN (
      'Pending', 'Submitted', 'In Transit', 'Delivered',
      'Failed', 'Returned', 'Cancelled'
    )
  ) THEN
    RAISE EXCEPTION 'Cannot finalize courier statuses while unsupported values exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "public"."notification"
    WHERE "status" IS NOT NULL
      AND LOWER(BTRIM("status")) NOT IN ('pending', 'sent', 'failed')
  ) THEN
    RAISE EXCEPTION 'Cannot normalize notification statuses while unsupported values exist.';
  END IF;
END $$;

ALTER TABLE "public"."order_item"
  ADD CONSTRAINT "order_item_order_id_variant_id_key"
    UNIQUE ("order_id", "variant_id");

ALTER TABLE "public"."salary_record"
  DROP CONSTRAINT IF EXISTS "salary_record_paid_check",
  ADD CONSTRAINT "salary_record_paid_check" CHECK (
    "payment_status" <> 'Paid' OR "paid_at" IS NOT NULL
  );

-- Submitted describes the Koombiyo API handoff, not the parcel state. Existing
-- rows using it are returned to Pending until a courier tracking event arrives.
UPDATE "public"."delivery"
SET "delivery_status" = 'Pending'
WHERE "delivery_status" = 'Submitted';

ALTER TABLE "public"."delivery"
  DROP CONSTRAINT IF EXISTS "delivery_status_check",
  ADD CONSTRAINT "delivery_status_check" CHECK (
    "delivery_status" IN (
      'Pending', 'In Transit', 'Delivered',
      'Failed', 'Returned', 'Cancelled'
    )
  );

ALTER TABLE "public"."notification"
  ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'IN_APP';

-- Normalize the legacy lowercase status/default without losing delivery state.
UPDATE "public"."notification"
SET "status" = CASE
      WHEN "status" IS NULL AND "recipient_profile_id" IS NOT NULL THEN 'Sent'
      WHEN "status" IS NULL THEN 'Pending'
      WHEN LOWER(BTRIM("status")) = 'sent' THEN 'Sent'
      WHEN LOWER(BTRIM("status")) = 'failed' THEN 'Failed'
      ELSE 'Pending'
    END;

UPDATE "public"."notification"
SET "sent_at" = COALESCE("sent_at", "created_at")
WHERE "status" = 'Sent';

ALTER TABLE "public"."notification"
  ALTER COLUMN "recipient_profile_id" DROP NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'Pending',
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "sent_at" DROP DEFAULT,
  ADD CONSTRAINT "notification_channel_check"
    CHECK ("channel" IN ('IN_APP', 'EMAIL', 'SMS')),
  ADD CONSTRAINT "notification_status_check"
    CHECK ("status" IN ('Pending', 'Sent', 'Failed')),
  ADD CONSTRAINT "notification_recipient_check" CHECK (
    "recipient_profile_id" IS NOT NULL
    OR "order_id" IS NOT NULL
    OR "checkout_id" IS NOT NULL
  ),
  ADD CONSTRAINT "notification_in_app_recipient_check" CHECK (
    "channel" <> 'IN_APP' OR "recipient_profile_id" IS NOT NULL
  ),
  ADD CONSTRAINT "notification_sent_at_check" CHECK (
    "status" <> 'Sent' OR "sent_at" IS NOT NULL
  );

COMMIT;
