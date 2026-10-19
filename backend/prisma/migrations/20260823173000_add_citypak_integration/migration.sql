-- AlterTable "delivery"
ALTER TABLE "public"."delivery"
  ALTER COLUMN "courier_name" SET DEFAULT 'Citypak',
  ADD COLUMN IF NOT EXISTS "shipment_reference" TEXT,
  ADD COLUMN IF NOT EXISTS "external_order_id" TEXT,
  ADD COLUMN IF NOT EXISTS "package_weight_grams" INTEGER,
  ADD COLUMN IF NOT EXISTS "number_of_pieces" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "package_description" TEXT,
  ADD COLUMN IF NOT EXISTS "cod_amount" DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "courier_status" TEXT,
  ADD COLUMN IF NOT EXISTS "courier_status_type" TEXT,
  ADD COLUMN IF NOT EXISTS "last_tracking_sync_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "pod_image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "receiver_name" TEXT,
  ADD COLUMN IF NOT EXISTS "receiver_nic" TEXT,
  ADD COLUMN IF NOT EXISTS "submitted_by_employee_id" UUID,
  ADD COLUMN IF NOT EXISTS "package_length_cm" DECIMAL,
  ADD COLUMN IF NOT EXISTS "package_width_cm" DECIMAL,
  ADD COLUMN IF NOT EXISTS "package_height_cm" DECIMAL;

-- CreateTable "courier_shipper_profile"
CREATE TABLE IF NOT EXISTS "public"."courier_shipper_profile" (
    "profile_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "courier_name" TEXT NOT NULL DEFAULT 'Citypak',
    "branch_id" UUID,
    "shipper_name" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "address_line_3" TEXT,
    "address_line_4_city" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_number_1" TEXT NOT NULL,
    "contact_number_2" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_shipper_profile_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable "delivery_waybill"
CREATE TABLE IF NOT EXISTS "public"."delivery_waybill" (
    "waybill_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_id" UUID NOT NULL,
    "tracking_number" TEXT NOT NULL,
    "reference" TEXT,
    "delivery_facility_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_waybill_pkey" PRIMARY KEY ("waybill_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "delivery_waybill_tracking_number_key" ON "public"."delivery_waybill"("tracking_number");
CREATE INDEX IF NOT EXISTS "delivery_waybill_delivery_id_idx" ON "public"."delivery_waybill"("delivery_id");

-- CreateTable "delivery_tracking_event"
CREATE TABLE IF NOT EXISTS "public"."delivery_tracking_event" (
    "event_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_id" UUID NOT NULL,
    "waybill_id" UUID,
    "tracking_number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "status_type" TEXT,
    "status_code" TEXT,
    "description" TEXT,
    "reason" TEXT,
    "location" TEXT,
    "event_at" TIMESTAMPTZ(6) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'TRACKING_API',
    "external_item_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_tracking_event_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "delivery_tracking_event_tracking_number_status_event_at_key" ON "public"."delivery_tracking_event"("tracking_number", "status", "event_at");
CREATE INDEX IF NOT EXISTS "delivery_tracking_event_delivery_id_idx" ON "public"."delivery_tracking_event"("delivery_id");

-- CreateTable "courier_pickup_request"
CREATE TABLE IF NOT EXISTS "public"."courier_pickup_request" (
    "pickup_request_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "courier_name" TEXT NOT NULL DEFAULT 'Citypak',
    "external_pickup_id" INTEGER,
    "requested_by_employee_id" UUID,
    "branch_id" UUID,
    "pickup_address_line_1" TEXT NOT NULL,
    "pickup_address_line_2" TEXT,
    "pickup_address_line_3" TEXT,
    "pickup_address_line_4_city" TEXT NOT NULL,
    "pickup_contact_person" TEXT NOT NULL,
    "pickup_contact_number_1" TEXT NOT NULL,
    "estimated_pickup_weight_grams" INTEGER NOT NULL,
    "estimated_waybill_count" INTEGER NOT NULL,
    "pickup_from_datetime" TIMESTAMPTZ(6) NOT NULL,
    "pickup_to_datetime" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Requested',
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_pickup_request_pkey" PRIMARY KEY ("pickup_request_id")
);

-- CreateTable "courier_pickup_delivery"
CREATE TABLE IF NOT EXISTS "public"."courier_pickup_delivery" (
    "pickup_request_id" UUID NOT NULL,
    "delivery_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_pickup_delivery_pkey" PRIMARY KEY ("pickup_request_id","delivery_id")
);

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_submitted_by_employee_id_fkey') THEN
    ALTER TABLE "public"."delivery" ADD CONSTRAINT "delivery_submitted_by_employee_id_fkey" FOREIGN KEY ("submitted_by_employee_id") REFERENCES "public"."employee"("employee_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courier_shipper_profile_branch_id_fkey') THEN
    ALTER TABLE "public"."courier_shipper_profile" ADD CONSTRAINT "courier_shipper_profile_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_waybill_delivery_id_fkey') THEN
    ALTER TABLE "public"."delivery_waybill" ADD CONSTRAINT "delivery_waybill_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("delivery_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_tracking_event_delivery_id_fkey') THEN
    ALTER TABLE "public"."delivery_tracking_event" ADD CONSTRAINT "delivery_tracking_event_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("delivery_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_tracking_event_waybill_id_fkey') THEN
    ALTER TABLE "public"."delivery_tracking_event" ADD CONSTRAINT "delivery_tracking_event_waybill_id_fkey" FOREIGN KEY ("waybill_id") REFERENCES "public"."delivery_waybill"("waybill_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courier_pickup_request_requested_by_employee_id_fkey') THEN
    ALTER TABLE "public"."courier_pickup_request" ADD CONSTRAINT "courier_pickup_request_requested_by_employee_id_fkey" FOREIGN KEY ("requested_by_employee_id") REFERENCES "public"."employee"("employee_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courier_pickup_request_branch_id_fkey') THEN
    ALTER TABLE "public"."courier_pickup_request" ADD CONSTRAINT "courier_pickup_request_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courier_pickup_delivery_pickup_request_id_fkey') THEN
    ALTER TABLE "public"."courier_pickup_delivery" ADD CONSTRAINT "courier_pickup_delivery_pickup_request_id_fkey" FOREIGN KEY ("pickup_request_id") REFERENCES "public"."courier_pickup_request"("pickup_request_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courier_pickup_delivery_delivery_id_fkey') THEN
    ALTER TABLE "public"."courier_pickup_delivery" ADD CONSTRAINT "courier_pickup_delivery_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("delivery_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
