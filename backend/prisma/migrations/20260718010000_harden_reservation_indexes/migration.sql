-- PostgreSQL treats NULL values as distinct in a normal unique constraint.
-- Keep one inventory row per assigned branch and one temporary branchless row
-- per variant until the product-creation flow assigns branches explicitly.
ALTER TABLE "public"."inventory"
  DROP CONSTRAINT IF EXISTS "inventory_variant_branch_unique";

CREATE UNIQUE INDEX "inventory_variant_branch_unique"
  ON "public"."inventory" ("variant_id", "branch_id")
  WHERE "branch_id" IS NOT NULL;

CREATE UNIQUE INDEX "inventory_variant_without_branch_unique"
  ON "public"."inventory" ("variant_id")
  WHERE "branch_id" IS NULL;

-- Expiry work filters active holds first, then compares their deadline.
DROP INDEX IF EXISTS "public"."stock_reservation_expiry_index";

CREATE INDEX "stock_reservation_expiry_index"
  ON "public"."stock_reservation" ("status", "expires_at");
