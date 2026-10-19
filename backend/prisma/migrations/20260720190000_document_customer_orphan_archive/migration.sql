-- This table is a temporary, non-relational migration safety backup. It must
-- never participate in authentication, customer, cart, order, or review flows.
ALTER TABLE "public"."customer_profile_orphan_archive"
  ADD COLUMN IF NOT EXISTS "archive_reason" TEXT;

UPDATE "public"."customer_profile_orphan_archive"
SET "archive_reason" = 'Missing related profile'
WHERE NULLIF(BTRIM("archive_reason"), '') IS NULL;

ALTER TABLE "public"."customer_profile_orphan_archive"
  ALTER COLUMN "archive_reason" SET DEFAULT 'Missing related profile',
  ALTER COLUMN "archive_reason" SET NOT NULL;

COMMENT ON TABLE "public"."customer_profile_orphan_archive" IS
  'Temporary migration backup for invalid customer rows. Not part of the application data model; export and remove after the retention period.';

COMMENT ON COLUMN "public"."customer_profile_orphan_archive"."profile_id" IS
  'Original profile identifier from the archived customer row. Deliberately not a foreign key.';
