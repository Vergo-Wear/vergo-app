-- Account profile/customer creation is owned by AuthService after Supabase Auth
-- has created the identity. The legacy trigger predates the normalized customer
-- schema (contact_email/contact_phone) and also bypasses Google onboarding by
-- creating an already-onboarded profile before the user completes that flow.
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
DROP FUNCTION IF EXISTS "public"."handle_new_user"();
