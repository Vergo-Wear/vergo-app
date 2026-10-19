ALTER TABLE "product_variant"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'show';

CREATE INDEX "product_variant_product_id_status_idx"
ON "product_variant" ("product_id", "status");
