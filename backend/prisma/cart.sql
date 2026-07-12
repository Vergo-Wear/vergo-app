-- Existing databases use normalized cart and cart_item tables.
CREATE TABLE IF NOT EXISTS "public"."cart" (
  "cart_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" UUID REFERENCES "public"."customer"("customer_id") ON DELETE CASCADE,
  "session_id" TEXT,
  "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "cart_customer_id_key"
ON "public"."cart"("customer_id") WHERE "customer_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "public"."cart_item" (
  "cart_item_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cart_id" UUID REFERENCES "public"."cart"("cart_id") ON DELETE CASCADE,
  "variant_id" UUID REFERENCES "public"."product_variant"("variant_id"),
  "quantity" INTEGER DEFAULT 1
);
