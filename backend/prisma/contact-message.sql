CREATE TABLE IF NOT EXISTS "public"."contact_message" (
  "message_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "full_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
