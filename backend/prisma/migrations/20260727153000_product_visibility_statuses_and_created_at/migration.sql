ALTER TABLE "product"
ADD COLUMN "created_at" TIMESTAMPTZ(6);

UPDATE "product" AS product
SET "created_at" = COALESCE(
  (
    SELECT MIN(inventory."last_updated")
    FROM "product_variant" AS variant
    INNER JOIN "inventory" AS inventory
      ON inventory."variant_id" = variant."variant_id"
    WHERE variant."product_id" = product."product_id"
  ),
  CURRENT_TIMESTAMP
);

ALTER TABLE "product"
ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "created_at" SET NOT NULL;

UPDATE "product"
SET "status" = CASE LOWER(COALESCE("status", ''))
  WHEN 'active' THEN 'live'
  WHEN 'live' THEN 'live'
  WHEN 'hold' THEN 'hold'
  ELSE 'hidden'
END;

ALTER TABLE "product"
ALTER COLUMN "status" SET DEFAULT 'hidden',
ALTER COLUMN "status" SET NOT NULL;

CREATE INDEX "product_created_at_idx"
ON "product" ("created_at" DESC);
