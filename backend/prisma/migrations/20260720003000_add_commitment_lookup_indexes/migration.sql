-- Support direct commitment lookups by each foreign key. The composite
-- order/status index remains useful for lifecycle queries, while these indexes
-- also cover foreign-key joins and item/inventory restoration lookups.
CREATE INDEX IF NOT EXISTS "inventory_commitment_order_id_idx"
  ON "public"."inventory_commitment" ("order_id");

CREATE INDEX IF NOT EXISTS "inventory_commitment_order_item_id_idx"
  ON "public"."inventory_commitment" ("order_item_id");

CREATE INDEX IF NOT EXISTS "inventory_commitment_inventory_id_idx"
  ON "public"."inventory_commitment" ("inventory_id");
