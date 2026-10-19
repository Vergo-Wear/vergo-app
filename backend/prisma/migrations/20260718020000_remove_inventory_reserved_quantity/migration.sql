-- Active stock holds are now represented solely by stock_reservation rows.
-- This is idempotent because the column was already removed from the live
-- database before the migration history caught up.
ALTER TABLE "public"."inventory"
  DROP CONSTRAINT IF EXISTS "inventory_reserved_not_above_quantity";

ALTER TABLE "public"."inventory"
  DROP COLUMN IF EXISTS "reserved_quantity";
