CREATE TABLE IF NOT EXISTS "public"."review" (
  "review_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL REFERENCES "public"."product"("product_id") ON DELETE CASCADE,
  "customer_id" UUID NOT NULL REFERENCES "public"."customer"("customer_id") ON DELETE CASCADE,
  "rating" INTEGER NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
  "comment" TEXT NOT NULL,
  "images" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("product_id", "customer_id")
);
