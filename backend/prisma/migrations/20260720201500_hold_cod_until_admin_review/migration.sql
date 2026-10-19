-- COD checkout rows now own non-expiring Active stock holds until an Admin
-- approves, rejects, or the registered customer cancels the checkout.
ALTER TABLE "public"."stock_reservation"
  ALTER COLUMN "expires_at" DROP NOT NULL;

COMMENT ON COLUMN "public"."stock_reservation"."expires_at" IS
  'Bank Transfer holds expire after the payment window; COD holds remain NULL until Admin review.';

-- Backfill any COD checkouts submitted before this lifecycle was introduced.
-- Inventory is locked and allocated deterministically so the migration cannot
-- overbook units already held by another checkout.
DO $$
DECLARE
  checkout_row RECORD;
  item_row RECORD;
  inventory_row RECORD;
  held_quantity INTEGER;
  available_quantity INTEGER;
  allocated_quantity INTEGER;
  remaining_quantity INTEGER;
BEGIN
  FOR checkout_row IN
    SELECT checkout."checkout_id"
    FROM "public"."pending_checkout" AS checkout
    WHERE checkout."payment_method" = 'Cash on Delivery'
      AND checkout."status" = 'Pending Confirmation'
      AND NOT EXISTS (
        SELECT 1
        FROM "public"."stock_reservation" AS reservation
        WHERE reservation."checkout_id" = checkout."checkout_id"
      )
    ORDER BY checkout."created_at", checkout."checkout_id"
  LOOP
    FOR item_row IN
      SELECT item."variant_id", item."quantity"
      FROM "public"."pending_checkout_item" AS item
      WHERE item."checkout_id" = checkout_row."checkout_id"
      ORDER BY item."variant_id"
    LOOP
      remaining_quantity := item_row."quantity";

      FOR inventory_row IN
        SELECT inventory."inventory_id", inventory."quantity"
        FROM "public"."inventory" AS inventory
        WHERE inventory."variant_id" = item_row."variant_id"
        ORDER BY inventory."inventory_id"
        FOR UPDATE
      LOOP
        EXIT WHEN remaining_quantity = 0;

        SELECT COALESCE(SUM(reservation."quantity"), 0)::INTEGER
        INTO held_quantity
        FROM "public"."stock_reservation" AS reservation
        WHERE reservation."inventory_id" = inventory_row."inventory_id"
          AND reservation."status" IN ('Active', 'Pending Verification');

        available_quantity := GREATEST(
          0,
          inventory_row."quantity" - held_quantity
        );
        allocated_quantity := LEAST(
          remaining_quantity,
          available_quantity
        );

        IF allocated_quantity > 0 THEN
          INSERT INTO "public"."stock_reservation"
            ("checkout_id", "inventory_id", "quantity", "status", "expires_at")
          VALUES
            (checkout_row."checkout_id", inventory_row."inventory_id",
             allocated_quantity, 'Active', NULL);
          remaining_quantity := remaining_quantity - allocated_quantity;
        END IF;
      END LOOP;

      IF remaining_quantity > 0 THEN
        RAISE EXCEPTION
          'Cannot reserve existing COD checkout %: variant % is short by % unit(s).',
          checkout_row."checkout_id", item_row."variant_id", remaining_quantity;
      END IF;
    END LOOP;
  END LOOP;
END $$;

UPDATE "public"."stock_reservation" AS reservation
SET "expires_at" = NULL
FROM "public"."pending_checkout" AS checkout
WHERE checkout."checkout_id" = reservation."checkout_id"
  AND checkout."payment_method" = 'Cash on Delivery'
  AND checkout."status" = 'Pending Confirmation'
  AND reservation."status" = 'Active';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."pending_checkout" AS checkout
    JOIN "public"."pending_checkout_item" AS item
      ON item."checkout_id" = checkout."checkout_id"
    LEFT JOIN "public"."inventory" AS inventory
      ON inventory."variant_id" = item."variant_id"
    LEFT JOIN "public"."stock_reservation" AS reservation
      ON reservation."checkout_id" = checkout."checkout_id"
     AND reservation."inventory_id" = inventory."inventory_id"
     AND reservation."status" = 'Active'
    WHERE checkout."payment_method" = 'Cash on Delivery'
      AND checkout."status" = 'Pending Confirmation'
    GROUP BY checkout."checkout_id", item."variant_id", item."quantity"
    HAVING COALESCE(SUM(reservation."quantity"), 0) <> item."quantity"
  ) THEN
    RAISE EXCEPTION 'A pending COD checkout does not have a complete Active stock hold.';
  END IF;
END $$;
