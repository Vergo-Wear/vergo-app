CREATE TABLE "public"."color" (
  "color_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "hex_code" TEXT,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "color_pkey" PRIMARY KEY ("color_id"),
  CONSTRAINT "color_name_not_blank_check" CHECK (BTRIM("name") <> ''),
  CONSTRAINT "color_hex_code_check"
    CHECK ("hex_code" IS NULL OR "hex_code" ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT "color_display_order_check" CHECK ("display_order" >= 0),
  CONSTRAINT "color_status_check"
    CHECK ("status" IN ('Active', 'Inactive'))
);

CREATE UNIQUE INDEX "color_name_ci_key"
  ON "public"."color" (LOWER(BTRIM("name")));

CREATE INDEX "color_status_display_order_index"
  ON "public"."color" ("status", "display_order");

CREATE TABLE "public"."size" (
  "size_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "size_pkey" PRIMARY KEY ("size_id"),
  CONSTRAINT "size_name_not_blank_check" CHECK (BTRIM("name") <> ''),
  CONSTRAINT "size_display_order_check" CHECK ("display_order" >= 0),
  CONSTRAINT "size_status_check"
    CHECK ("status" IN ('Active', 'Inactive'))
);

CREATE UNIQUE INDEX "size_name_ci_key"
  ON "public"."size" (LOWER(BTRIM("name")));

CREATE INDEX "size_status_display_order_index"
  ON "public"."size" ("status", "display_order");

WITH candidates AS (
  SELECT
    "value" AS "name",
    "display_order",
    "status",
    0 AS "source_priority"
  FROM "public"."variant_option"
  WHERE "option_type" = 'Color'
  UNION ALL
  SELECT
    "color" AS "name",
    0 AS "display_order",
    'Active' AS "status",
    1 AS "source_priority"
  FROM "public"."product_variant"
),
ranked AS (
  SELECT
    BTRIM("name") AS "name",
    "display_order",
    "status",
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(BTRIM("name"))
      ORDER BY "source_priority", "display_order", "name"
    ) AS "row_number"
  FROM candidates
  WHERE NULLIF(BTRIM("name"), '') IS NOT NULL
)
INSERT INTO "public"."color" ("name", "display_order", "status")
SELECT "name", "display_order", "status"
FROM ranked
WHERE "row_number" = 1;

WITH candidates AS (
  SELECT
    "value" AS "name",
    "display_order",
    "status",
    0 AS "source_priority"
  FROM "public"."variant_option"
  WHERE "option_type" = 'Size'
  UNION ALL
  SELECT
    "size" AS "name",
    0 AS "display_order",
    'Active' AS "status",
    1 AS "source_priority"
  FROM "public"."product_variant"
),
ranked AS (
  SELECT
    BTRIM("name") AS "name",
    "display_order",
    "status",
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(BTRIM("name"))
      ORDER BY "source_priority", "display_order", "name"
    ) AS "row_number"
  FROM candidates
  WHERE NULLIF(BTRIM("name"), '') IS NOT NULL
)
INSERT INTO "public"."size" ("name", "display_order", "status")
SELECT "name", "display_order", "status"
FROM ranked
WHERE "row_number" = 1;

ALTER TABLE "public"."product_variant"
  ADD COLUMN "color_id" UUID,
  ADD COLUMN "size_id" UUID;

UPDATE "public"."product_variant" AS variant
SET "color_id" = color."color_id"
FROM "public"."color" AS color
WHERE LOWER(BTRIM(variant."color")) = LOWER(BTRIM(color."name"));

UPDATE "public"."product_variant" AS variant
SET "size_id" = size."size_id"
FROM "public"."size" AS size
WHERE LOWER(BTRIM(variant."size")) = LOWER(BTRIM(size."name"));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."product_variant"
    WHERE "color_id" IS NULL OR "size_id" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot normalize product variants because some color or size values could not be mapped.';
  END IF;
END
$$;

ALTER TABLE "public"."product_variant"
  ALTER COLUMN "color_id" SET NOT NULL,
  ALTER COLUMN "size_id" SET NOT NULL;

ALTER TABLE "public"."product_variant"
  DROP CONSTRAINT "product_variant_product_id_size_color_key";

ALTER TABLE "public"."product_variant"
  ADD CONSTRAINT "product_variant_color_id_fkey"
    FOREIGN KEY ("color_id") REFERENCES "public"."color"("color_id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "product_variant_size_id_fkey"
    FOREIGN KEY ("size_id") REFERENCES "public"."size"("size_id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "product_variant_product_id_size_id_color_id_key"
    UNIQUE ("product_id", "size_id", "color_id");

ALTER TABLE "public"."product_variant"
  DROP COLUMN "color",
  DROP COLUMN "size";

DROP TABLE "public"."variant_option";
