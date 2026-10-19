CREATE TABLE "public"."variant_option" (
  "option_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "option_type" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "variant_option_pkey" PRIMARY KEY ("option_id"),
  CONSTRAINT "variant_option_type_check"
    CHECK ("option_type" IN ('Color', 'Size')),
  CONSTRAINT "variant_option_status_check"
    CHECK ("status" IN ('Active', 'Inactive')),
  CONSTRAINT "variant_option_display_order_check"
    CHECK ("display_order" >= 0)
);

CREATE UNIQUE INDEX "variant_option_option_type_value_key"
  ON "public"."variant_option" ("option_type", "value");

CREATE INDEX "variant_option_type_status_order_index"
  ON "public"."variant_option" ("option_type", "status", "display_order");

INSERT INTO "public"."variant_option"
  ("option_type", "value", "display_order")
SELECT
  'Color',
  TRIM("color"),
  ROW_NUMBER() OVER (ORDER BY LOWER(TRIM("color"))) - 1
FROM "public"."product_variant"
WHERE NULLIF(TRIM("color"), '') IS NOT NULL
GROUP BY TRIM("color")
ON CONFLICT ("option_type", "value") DO NOTHING;

INSERT INTO "public"."variant_option"
  ("option_type", "value", "display_order")
SELECT
  'Size',
  TRIM("size"),
  ROW_NUMBER() OVER (ORDER BY LOWER(TRIM("size"))) - 1
FROM "public"."product_variant"
WHERE NULLIF(TRIM("size"), '') IS NOT NULL
GROUP BY TRIM("size")
ON CONFLICT ("option_type", "value") DO NOTHING;
