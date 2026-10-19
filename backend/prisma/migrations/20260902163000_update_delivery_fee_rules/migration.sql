-- Migration: Update delivery_fee_rules structure for quantity-based rules

-- 1. Add new columns with default values
ALTER TABLE public.delivery_fee_rules
  ADD COLUMN IF NOT EXISTS base_delivery_fee numeric NOT NULL DEFAULT 400,
  ADD COLUMN IF NOT EXISTS base_item_limit integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS additional_item_block_size integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS additional_block_fee numeric NOT NULL DEFAULT 140,
  ADD COLUMN IF NOT EXISTS fuel_surcharge_percentage numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Drop legacy fee_amount column if it exists
ALTER TABLE public.delivery_fee_rules
  DROP COLUMN IF EXISTS fee_amount;

-- 3. Seed all 25 Sri Lankan districts with default values if missing
INSERT INTO public.delivery_fee_rules (district, base_delivery_fee, base_item_limit, additional_item_block_size, additional_block_fee, fuel_surcharge_percentage, is_active)
VALUES
  ('Ampara', 400, 5, 5, 140, 15, true),
  ('Anuradhapura', 400, 5, 5, 140, 15, true),
  ('Badulla', 400, 5, 5, 140, 15, true),
  ('Batticaloa', 400, 5, 5, 140, 15, true),
  ('Colombo', 400, 5, 5, 140, 15, true),
  ('Galle', 400, 5, 5, 140, 15, true),
  ('Gampaha', 400, 5, 5, 140, 15, true),
  ('Hambantota', 400, 5, 5, 140, 15, true),
  ('Jaffna', 400, 5, 5, 140, 15, true),
  ('Kalutara', 400, 5, 5, 140, 15, true),
  ('Kandy', 400, 5, 5, 140, 15, true),
  ('Kegalle', 400, 5, 5, 140, 15, true),
  ('Kilinochchi', 400, 5, 5, 140, 15, true),
  ('Kurunegala', 400, 5, 5, 140, 15, true),
  ('Mannar', 400, 5, 5, 140, 15, true),
  ('Matale', 400, 5, 5, 140, 15, true),
  ('Matara', 400, 5, 5, 140, 15, true),
  ('Monaragala', 400, 5, 5, 140, 15, true),
  ('Mullaitivu', 400, 5, 5, 140, 15, true),
  ('Nuwara Eliya', 400, 5, 5, 140, 15, true),
  ('Polonnaruwa', 400, 5, 5, 140, 15, true),
  ('Puttalam', 400, 5, 5, 140, 15, true),
  ('Ratnapura', 400, 5, 5, 140, 15, true),
  ('Trincomalee', 400, 5, 5, 140, 15, true),
  ('Vavuniya', 400, 5, 5, 140, 15, true)
ON CONFLICT (district) DO NOTHING;

-- 4. Add check constraints safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_fee_rules_base_fee_check') THEN
    ALTER TABLE public.delivery_fee_rules ADD CONSTRAINT delivery_fee_rules_base_fee_check CHECK (base_delivery_fee >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_fee_rules_base_item_limit_check') THEN
    ALTER TABLE public.delivery_fee_rules ADD CONSTRAINT delivery_fee_rules_base_item_limit_check CHECK (base_item_limit > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_fee_rules_block_size_check') THEN
    ALTER TABLE public.delivery_fee_rules ADD CONSTRAINT delivery_fee_rules_block_size_check CHECK (additional_item_block_size > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_fee_rules_additional_fee_check') THEN
    ALTER TABLE public.delivery_fee_rules ADD CONSTRAINT delivery_fee_rules_additional_fee_check CHECK (additional_block_fee >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_fee_rules_fuel_check') THEN
    ALTER TABLE public.delivery_fee_rules ADD CONSTRAINT delivery_fee_rules_fuel_check CHECK (fuel_surcharge_percentage >= 0 AND fuel_surcharge_percentage <= 100);
  END IF;
END $$;
