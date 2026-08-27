-- ============================================================================
-- STEP 1: CREATE PRIVATE SCHEMA & SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;

GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT r.role_name INTO v_role_name
  FROM public.profiles p
  JOIN public.role r ON p.role_id = r.role_id
  WHERE p.id = auth.uid();
  
  RETURN v_role_name;
END;
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(private.get_user_role() = 'Admin', false);
$$;

CREATE OR REPLACE FUNCTION private.is_customer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(private.get_user_role() = 'Customer', false);
$$;

CREATE OR REPLACE FUNCTION private.is_employee()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(private.get_user_role() = 'Employee', false);
$$;

CREATE OR REPLACE FUNCTION private.get_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT customer_id FROM public.customer WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.get_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT employee_id FROM public.employee WHERE profile_id = auth.uid();
$$;

-- STEP 2: RESTRICT FUNCTION EXECUTION PERMISSIONS
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM anon;

GRANT EXECUTE ON FUNCTION private.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_customer() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_employee() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_customer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_employee_id() TO authenticated;

-- ============================================================================
-- STEP 3: UPDATE RLS POLICIES TO USE PRIVATE HELPERS & (SELECT AUTH.UID())
-- ============================================================================

-- Table: public._prisma_migrations
DROP POLICY IF EXISTS "deny_delete_prisma_migrations" ON public."_prisma_migrations";
CREATE POLICY "deny_delete_prisma_migrations" ON public."_prisma_migrations" FOR DELETE TO anon,authenticated USING (false);
DROP POLICY IF EXISTS "deny_insert_prisma_migrations" ON public."_prisma_migrations";
CREATE POLICY "deny_insert_prisma_migrations" ON public."_prisma_migrations" FOR INSERT TO anon,authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "deny_select_prisma_migrations" ON public."_prisma_migrations";
CREATE POLICY "deny_select_prisma_migrations" ON public."_prisma_migrations" FOR SELECT TO anon,authenticated USING (false);
DROP POLICY IF EXISTS "deny_update_prisma_migrations" ON public."_prisma_migrations";
CREATE POLICY "deny_update_prisma_migrations" ON public."_prisma_migrations" FOR UPDATE TO anon,authenticated USING (false) WITH CHECK (false);
-- Table: public.attendance
DROP POLICY IF EXISTS "attendance_delete_policy" ON public."attendance";
CREATE POLICY "attendance_delete_policy" ON public."attendance" FOR DELETE TO authenticated USING ((select private.is_admin()));
DROP POLICY IF EXISTS "attendance_insert_policy" ON public."attendance";
CREATE POLICY "attendance_insert_policy" ON public."attendance" FOR INSERT TO authenticated WITH CHECK (((employee_id = (select private.get_employee_id())) OR (select private.is_admin())));
DROP POLICY IF EXISTS "attendance_select_policy" ON public."attendance";
CREATE POLICY "attendance_select_policy" ON public."attendance" FOR SELECT TO authenticated USING (((employee_id = (select private.get_employee_id())) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "attendance_update_policy" ON public."attendance";
CREATE POLICY "attendance_update_policy" ON public."attendance" FOR UPDATE TO authenticated USING (((employee_id = (select private.get_employee_id())) OR (select private.is_admin()))) WITH CHECK (((employee_id = (select private.get_employee_id())) OR (select private.is_admin())));
-- Table: public.branch
DROP POLICY IF EXISTS "branch_select_policy" ON public."branch";
CREATE POLICY "branch_select_policy" ON public."branch" FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "branch_write_policy" ON public."branch";
CREATE POLICY "branch_insert_policy" ON public."branch" FOR INSERT TO authenticated WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "branch_update_policy" ON public."branch" FOR UPDATE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "branch_delete_policy" ON public."branch" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.cart
DROP POLICY IF EXISTS "cart_delete_policy" ON public."cart";
CREATE POLICY "cart_delete_policy" ON public."cart" FOR DELETE TO public USING (((customer_id = (select private.get_customer_id())) OR (customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "cart_insert_policy" ON public."cart";
CREATE POLICY "cart_insert_policy" ON public."cart" FOR INSERT TO public WITH CHECK (((customer_id = (select private.get_customer_id())) OR (customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "cart_select_policy" ON public."cart";
CREATE POLICY "cart_select_policy" ON public."cart" FOR SELECT TO public USING (((customer_id = (select private.get_customer_id())) OR (customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "cart_update_policy" ON public."cart";
CREATE POLICY "cart_update_policy" ON public."cart" FOR UPDATE TO public USING (((customer_id = (select private.get_customer_id())) OR (customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((customer_id = (select private.get_customer_id())) OR (customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())));
-- Table: public.cart_item
DROP POLICY IF EXISTS "cart_item_delete_policy" ON public."cart_item";
CREATE POLICY "cart_item_delete_policy" ON public."cart_item" FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM cart c
  WHERE ((c.cart_id = cart_item.cart_id) AND ((c.customer_id = (select private.get_customer_id())) OR (c.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "cart_item_insert_policy" ON public."cart_item";
CREATE POLICY "cart_item_insert_policy" ON public."cart_item" FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM cart c
  WHERE ((c.cart_id = cart_item.cart_id) AND ((c.customer_id = (select private.get_customer_id())) OR (c.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "cart_item_select_policy" ON public."cart_item";
CREATE POLICY "cart_item_select_policy" ON public."cart_item" FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM cart c
  WHERE ((c.cart_id = cart_item.cart_id) AND ((c.customer_id = (select private.get_customer_id())) OR (c.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "cart_item_update_policy" ON public."cart_item";
CREATE POLICY "cart_item_update_policy" ON public."cart_item" FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM cart c
  WHERE ((c.cart_id = cart_item.cart_id) AND ((c.customer_id = (select private.get_customer_id())) OR (c.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM cart c
  WHERE ((c.cart_id = cart_item.cart_id) AND ((c.customer_id = (select private.get_customer_id())) OR (c.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
-- Table: public.category
DROP POLICY IF EXISTS "category_select_policy" ON public."category";
CREATE POLICY "category_select_policy" ON public."category" FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "category_write_policy" ON public."category";
CREATE POLICY "category_write_policy" ON public."category" FOR ALL TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.color
DROP POLICY IF EXISTS "color_select_policy" ON public."color";
CREATE POLICY "color_select_policy" ON public."color" FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "color_write_policy" ON public."color";
CREATE POLICY "color_insert_policy" ON public."color" FOR INSERT TO authenticated WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "color_update_policy" ON public."color" FOR UPDATE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "color_delete_policy" ON public."color" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.contact_message
DROP POLICY IF EXISTS "contact_message_delete_policy" ON public."contact_message";
CREATE POLICY "contact_message_delete_policy" ON public."contact_message" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "contact_message_insert_policy" ON public."contact_message";
-- Removed contact_message_insert_policy for anon (submissions pass through NestJS backend).
DROP POLICY IF EXISTS "contact_message_select_policy" ON public."contact_message";
CREATE POLICY "contact_message_select_policy" ON public."contact_message" FOR SELECT TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "contact_message_update_policy" ON public."contact_message";
CREATE POLICY "contact_message_update_policy" ON public."contact_message" FOR UPDATE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.courier_pickup_delivery
DROP POLICY IF EXISTS "courier_pickup_delivery_all_policy" ON public."courier_pickup_delivery";
CREATE POLICY "courier_pickup_delivery_all_policy" ON public."courier_pickup_delivery" FOR ALL TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.courier_pickup_request
DROP POLICY IF EXISTS "courier_pickup_request_all_policy" ON public."courier_pickup_request";
CREATE POLICY "courier_pickup_request_all_policy" ON public."courier_pickup_request" FOR ALL TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.courier_shipper_profile
DROP POLICY IF EXISTS "courier_shipper_profile_all_policy" ON public."courier_shipper_profile";
CREATE POLICY "courier_shipper_profile_all_policy" ON public."courier_shipper_profile" FOR ALL TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.customer
DROP POLICY IF EXISTS "customer_delete_policy" ON public."customer";
CREATE POLICY "customer_delete_policy" ON public."customer" FOR DELETE TO authenticated USING ((select private.is_admin()));
DROP POLICY IF EXISTS "customer_insert_policy" ON public."customer";
CREATE POLICY "customer_insert_policy" ON public."customer" FOR INSERT TO authenticated WITH CHECK (((profile_id = (select auth.uid())) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "customer_select_policy" ON public."customer";
CREATE POLICY "customer_select_policy" ON public."customer" FOR SELECT TO authenticated USING (((profile_id = (select auth.uid())) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "customer_update_policy" ON public."customer";
CREATE POLICY "customer_update_policy" ON public."customer" FOR UPDATE TO authenticated USING (((profile_id = (select auth.uid())) OR (select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((profile_id = (select auth.uid())) OR (select private.is_admin()) OR (select private.is_employee())));
-- Table: public.delivery
DROP POLICY IF EXISTS "delivery_all_policy" ON public."delivery";
CREATE POLICY "delivery_all_policy" ON public."delivery" FOR ALL TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.delivery_fee_rules
DROP POLICY IF EXISTS "delivery_fee_rules_select_policy" ON public."delivery_fee_rules";
CREATE POLICY "delivery_fee_rules_select_policy" ON public."delivery_fee_rules" FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "delivery_fee_rules_write_policy" ON public."delivery_fee_rules";
CREATE POLICY "delivery_fee_rules_insert_policy" ON public."delivery_fee_rules" FOR INSERT TO authenticated WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "delivery_fee_rules_update_policy" ON public."delivery_fee_rules" FOR UPDATE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "delivery_fee_rules_delete_policy" ON public."delivery_fee_rules" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.delivery_tracking_event
DROP POLICY IF EXISTS "delivery_tracking_event_select_policy" ON public."delivery_tracking_event";
CREATE POLICY "delivery_tracking_event_select_policy" ON public."delivery_tracking_event" FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "delivery_tracking_event_write_policy" ON public."delivery_tracking_event";
CREATE POLICY "delivery_tracking_event_insert_policy" ON public."delivery_tracking_event" FOR INSERT TO authenticated WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "delivery_tracking_event_update_policy" ON public."delivery_tracking_event" FOR UPDATE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "delivery_tracking_event_delete_policy" ON public."delivery_tracking_event" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.delivery_waybill
DROP POLICY IF EXISTS "delivery_waybill_all_policy" ON public."delivery_waybill";
CREATE POLICY "delivery_waybill_all_policy" ON public."delivery_waybill" FOR ALL TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.employee
DROP POLICY IF EXISTS "employee_delete_policy" ON public."employee";
CREATE POLICY "employee_delete_policy" ON public."employee" FOR DELETE TO authenticated USING ((select private.is_admin()));
DROP POLICY IF EXISTS "employee_insert_policy" ON public."employee";
CREATE POLICY "employee_insert_policy" ON public."employee" FOR INSERT TO authenticated WITH CHECK ((select private.is_admin()));
DROP POLICY IF EXISTS "employee_select_policy" ON public."employee";
CREATE POLICY "employee_select_policy" ON public."employee" FOR SELECT TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "employee_update_policy" ON public."employee";
CREATE POLICY "employee_update_policy" ON public."employee" FOR UPDATE TO authenticated USING (((profile_id = (select auth.uid())) OR (select private.is_admin()))) WITH CHECK (((profile_id = (select auth.uid())) OR (select private.is_admin())));
-- Table: public.employee_commission
DROP POLICY IF EXISTS "employee_commission_select_policy" ON public."employee_commission";
CREATE POLICY "employee_commission_select_policy" ON public."employee_commission" FOR SELECT TO authenticated USING (((employee_id = (select private.get_employee_id())) OR (select private.is_admin())));
DROP POLICY IF EXISTS "employee_commission_write_policy" ON public."employee_commission";
CREATE POLICY "employee_commission_insert_policy" ON public."employee_commission" FOR INSERT TO authenticated WITH CHECK ((select private.is_admin()));
CREATE POLICY "employee_commission_update_policy" ON public."employee_commission" FOR UPDATE TO authenticated USING ((select private.is_admin())) WITH CHECK ((select private.is_admin()));
CREATE POLICY "employee_commission_delete_policy" ON public."employee_commission" FOR DELETE TO authenticated USING ((select private.is_admin()));
-- Table: public.images
DROP POLICY IF EXISTS "images_select_policy" ON public."images";
CREATE POLICY "images_select_policy" ON public."images" FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "images_write_policy" ON public."images";
CREATE POLICY "images_insert_policy" ON public."images" FOR INSERT TO authenticated WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "images_update_policy" ON public."images" FOR UPDATE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "images_delete_policy" ON public."images" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.inventory
DROP POLICY IF EXISTS "inventory_all_policy" ON public."inventory";
CREATE POLICY "inventory_all_policy" ON public."inventory" FOR ALL TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.inventory_commitment
DROP POLICY IF EXISTS "inventory_commitment_all_policy" ON public."inventory_commitment";
CREATE POLICY "inventory_commitment_all_policy" ON public."inventory_commitment" FOR ALL TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.notification
DROP POLICY IF EXISTS "notification_delete_policy" ON public."notification";
CREATE POLICY "notification_delete_policy" ON public."notification" FOR DELETE TO authenticated USING (((recipient_profile_id = (select auth.uid())) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "notification_insert_policy" ON public."notification";
CREATE POLICY "notification_insert_policy" ON public."notification" FOR INSERT TO authenticated WITH CHECK (((recipient_profile_id = (select auth.uid())) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "notification_select_policy" ON public."notification";
CREATE POLICY "notification_select_policy" ON public."notification" FOR SELECT TO authenticated USING (((recipient_profile_id = (select auth.uid())) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "notification_update_policy" ON public."notification";
CREATE POLICY "notification_update_policy" ON public."notification" FOR UPDATE TO authenticated USING (((recipient_profile_id = (select auth.uid())) OR (select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((recipient_profile_id = (select auth.uid())) OR (select private.is_admin()) OR (select private.is_employee())));
-- Table: public.order_customer_details
DROP POLICY IF EXISTS "order_customer_details_delete_policy" ON public."order_customer_details";
CREATE POLICY "order_customer_details_delete_policy" ON public."order_customer_details" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "order_customer_details_insert_policy" ON public."order_customer_details";
CREATE POLICY "order_customer_details_insert_policy" ON public."order_customer_details" FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.order_id = o.order_id) AND ((o.customer_id = (select private.get_customer_id())) OR (o.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "order_customer_details_select_policy" ON public."order_customer_details";
CREATE POLICY "order_customer_details_select_policy" ON public."order_customer_details" FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.order_id = o.order_id) AND ((o.customer_id = (select private.get_customer_id())) OR (o.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "order_customer_details_update_policy" ON public."order_customer_details";
CREATE POLICY "order_customer_details_update_policy" ON public."order_customer_details" FOR UPDATE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.order_item
DROP POLICY IF EXISTS "order_item_delete_policy" ON public."order_item";
CREATE POLICY "order_item_delete_policy" ON public."order_item" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "order_item_insert_policy" ON public."order_item";
CREATE POLICY "order_item_insert_policy" ON public."order_item" FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.order_id = o.order_id) AND ((o.customer_id = (select private.get_customer_id())) OR (o.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "order_item_select_policy" ON public."order_item";
CREATE POLICY "order_item_select_policy" ON public."order_item" FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.order_id = o.order_id) AND ((o.customer_id = (select private.get_customer_id())) OR (o.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "order_item_update_policy" ON public."order_item";
CREATE POLICY "order_item_update_policy" ON public."order_item" FOR UPDATE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.order_shipping_details
DROP POLICY IF EXISTS "order_shipping_details_delete_policy" ON public."order_shipping_details";
CREATE POLICY "order_shipping_details_delete_policy" ON public."order_shipping_details" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "order_shipping_details_insert_policy" ON public."order_shipping_details";
CREATE POLICY "order_shipping_details_insert_policy" ON public."order_shipping_details" FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.order_id = o.order_id) AND ((o.customer_id = (select private.get_customer_id())) OR (o.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "order_shipping_details_select_policy" ON public."order_shipping_details";
CREATE POLICY "order_shipping_details_select_policy" ON public."order_shipping_details" FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.order_id = o.order_id) AND ((o.customer_id = (select private.get_customer_id())) OR (o.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "order_shipping_details_update_policy" ON public."order_shipping_details";
CREATE POLICY "order_shipping_details_update_policy" ON public."order_shipping_details" FOR UPDATE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.orders
DROP POLICY IF EXISTS "orders_delete_policy" ON public."orders";
CREATE POLICY "orders_delete_policy" ON public."orders" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "orders_insert_policy" ON public."orders";
CREATE POLICY "orders_insert_policy" ON public."orders" FOR INSERT TO public WITH CHECK (((customer_id = (select private.get_customer_id())) OR (customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "orders_select_policy" ON public."orders";
CREATE POLICY "orders_select_policy" ON public."orders" FOR SELECT TO public USING (((customer_id = (select private.get_customer_id())) OR (customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "orders_update_policy" ON public."orders";
CREATE POLICY "orders_update_policy" ON public."orders" FOR UPDATE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.payment_proof
DROP POLICY IF EXISTS "payment_proof_delete_policy" ON public."payment_proof";
CREATE POLICY "payment_proof_delete_policy" ON public."payment_proof" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "payment_proof_insert_policy" ON public."payment_proof";
CREATE POLICY "payment_proof_insert_policy" ON public."payment_proof" FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pc.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "payment_proof_select_policy" ON public."payment_proof";
CREATE POLICY "payment_proof_select_policy" ON public."payment_proof" FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pc.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "payment_proof_update_policy" ON public."payment_proof";
CREATE POLICY "payment_proof_update_policy" ON public."payment_proof" FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pc.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pc.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
-- Table: public.pending_checkout
DROP POLICY IF EXISTS "pending_checkout_delete_policy" ON public."pending_checkout";
CREATE POLICY "pending_checkout_delete_policy" ON public."pending_checkout" FOR DELETE TO public USING (((customer_id = (select private.get_customer_id())) OR (customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "pending_checkout_insert_policy" ON public."pending_checkout";
CREATE POLICY "pending_checkout_insert_policy" ON public."pending_checkout" FOR INSERT TO public WITH CHECK (((customer_id = (select private.get_customer_id())) OR (customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "pending_checkout_select_policy" ON public."pending_checkout";
CREATE POLICY "pending_checkout_select_policy" ON public."pending_checkout" FOR SELECT TO public USING (((customer_id = (select private.get_customer_id())) OR (customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "pending_checkout_update_policy" ON public."pending_checkout";
CREATE POLICY "pending_checkout_update_policy" ON public."pending_checkout" FOR UPDATE TO public USING (((customer_id = (select private.get_customer_id())) OR (customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((customer_id = (select private.get_customer_id())) OR (customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())));
-- Table: public.pending_checkout_customer_details
DROP POLICY IF EXISTS "pending_checkout_cust_details_delete" ON public."pending_checkout_customer_details";
CREATE POLICY "pending_checkout_cust_details_delete" ON public."pending_checkout_customer_details" FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_customer_details.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "pending_checkout_cust_details_insert" ON public."pending_checkout_customer_details";
CREATE POLICY "pending_checkout_cust_details_insert" ON public."pending_checkout_customer_details" FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_customer_details.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "pending_checkout_cust_details_select" ON public."pending_checkout_customer_details";
CREATE POLICY "pending_checkout_cust_details_select" ON public."pending_checkout_customer_details" FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_customer_details.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "pending_checkout_cust_details_update" ON public."pending_checkout_customer_details";
CREATE POLICY "pending_checkout_cust_details_update" ON public."pending_checkout_customer_details" FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_customer_details.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_customer_details.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
-- Table: public.pending_checkout_item
DROP POLICY IF EXISTS "pending_checkout_item_delete_policy" ON public."pending_checkout_item";
CREATE POLICY "pending_checkout_item_delete_policy" ON public."pending_checkout_item" FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_item.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "pending_checkout_item_insert_policy" ON public."pending_checkout_item";
CREATE POLICY "pending_checkout_item_insert_policy" ON public."pending_checkout_item" FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_item.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "pending_checkout_item_select_policy" ON public."pending_checkout_item";
CREATE POLICY "pending_checkout_item_select_policy" ON public."pending_checkout_item" FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_item.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "pending_checkout_item_update_policy" ON public."pending_checkout_item";
CREATE POLICY "pending_checkout_item_update_policy" ON public."pending_checkout_item" FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_item.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_item.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
-- Table: public.pending_checkout_shipping_details
DROP POLICY IF EXISTS "pending_checkout_ship_details_delete" ON public."pending_checkout_shipping_details";
CREATE POLICY "pending_checkout_ship_details_delete" ON public."pending_checkout_shipping_details" FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_shipping_details.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "pending_checkout_ship_details_insert" ON public."pending_checkout_shipping_details";
CREATE POLICY "pending_checkout_ship_details_insert" ON public."pending_checkout_shipping_details" FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_shipping_details.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "pending_checkout_ship_details_select" ON public."pending_checkout_shipping_details";
CREATE POLICY "pending_checkout_ship_details_select" ON public."pending_checkout_shipping_details" FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_shipping_details.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "pending_checkout_ship_details_update" ON public."pending_checkout_shipping_details";
CREATE POLICY "pending_checkout_ship_details_update" ON public."pending_checkout_shipping_details" FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_shipping_details.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = pending_checkout_shipping_details.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
-- Table: public.product
DROP POLICY IF EXISTS "product_select_policy" ON public."product";
CREATE POLICY "product_select_policy" ON public."product" FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "product_write_policy" ON public."product";
CREATE POLICY "product_insert_policy" ON public."product" FOR INSERT TO authenticated WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "product_update_policy" ON public."product" FOR UPDATE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "product_delete_policy" ON public."product" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.product_variant
DROP POLICY IF EXISTS "product_variant_select_policy" ON public."product_variant";
CREATE POLICY "product_variant_select_policy" ON public."product_variant" FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "product_variant_write_policy" ON public."product_variant";
CREATE POLICY "product_variant_insert_policy" ON public."product_variant" FOR INSERT TO authenticated WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "product_variant_update_policy" ON public."product_variant" FOR UPDATE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "product_variant_delete_policy" ON public."product_variant" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.profiles
DROP POLICY IF EXISTS "profiles_delete_policy" ON public."profiles";
CREATE POLICY "profiles_delete_policy" ON public."profiles" FOR DELETE TO authenticated USING ((select private.is_admin()));
DROP POLICY IF EXISTS "profiles_insert_policy" ON public."profiles";
CREATE POLICY "profiles_insert_policy" ON public."profiles" FOR INSERT TO authenticated WITH CHECK (((id = (select auth.uid())) OR (select private.is_admin())));
DROP POLICY IF EXISTS "profiles_select_policy" ON public."profiles";
CREATE POLICY "profiles_select_policy" ON public."profiles" FOR SELECT TO authenticated USING (((id = (select auth.uid())) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "profiles_update_policy" ON public."profiles";
CREATE POLICY "profiles_update_policy" ON public."profiles" FOR UPDATE TO authenticated USING (((id = (select auth.uid())) OR (select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((id = (select auth.uid())) OR (select private.is_admin()) OR (select private.is_employee())));
-- Table: public.purchase_order
DROP POLICY IF EXISTS "purchase_order_all_policy" ON public."purchase_order";
CREATE POLICY "purchase_order_all_policy" ON public."purchase_order" FOR ALL TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.purchase_order_item
DROP POLICY IF EXISTS "purchase_order_item_all_policy" ON public."purchase_order_item";
CREATE POLICY "purchase_order_item_all_policy" ON public."purchase_order_item" FOR ALL TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.review
DROP POLICY IF EXISTS "review_delete_policy" ON public."review";
CREATE POLICY "review_delete_policy" ON public."review" FOR DELETE TO authenticated USING (((customer_id = (select private.get_customer_id())) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "review_insert_policy" ON public."review";
CREATE POLICY "review_insert_policy" ON public."review" FOR INSERT TO authenticated WITH CHECK (((customer_id = (select private.get_customer_id())) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "review_select_policy" ON public."review";
CREATE POLICY "review_select_policy" ON public."review" FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "review_update_policy" ON public."review";
CREATE POLICY "review_update_policy" ON public."review" FOR UPDATE TO authenticated USING (((customer_id = (select private.get_customer_id())) OR (select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((customer_id = (select private.get_customer_id())) OR (select private.is_admin()) OR (select private.is_employee())));
-- Table: public.review_image
DROP POLICY IF EXISTS "review_image_delete_policy" ON public."review_image";
CREATE POLICY "review_image_delete_policy" ON public."review_image" FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM review r
  WHERE ((r.review_id = review_image.review_id) AND ((r.customer_id = (select private.get_customer_id())) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "review_image_insert_policy" ON public."review_image";
CREATE POLICY "review_image_insert_policy" ON public."review_image" FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM review r
  WHERE ((r.review_id = review_image.review_id) AND ((r.customer_id = (select private.get_customer_id())) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "review_image_select_policy" ON public."review_image";
CREATE POLICY "review_image_select_policy" ON public."review_image" FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "review_image_update_policy" ON public."review_image";
CREATE POLICY "review_image_update_policy" ON public."review_image" FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM review r
  WHERE ((r.review_id = review_image.review_id) AND ((r.customer_id = (select private.get_customer_id())) OR (select private.is_admin()) OR (select private.is_employee())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM review r
  WHERE ((r.review_id = review_image.review_id) AND ((r.customer_id = (select private.get_customer_id())) OR (select private.is_admin()) OR (select private.is_employee()))))));
-- Table: public.role
DROP POLICY IF EXISTS "role_select_policy" ON public."role";
CREATE POLICY "role_select_policy" ON public."role" FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "role_write_policy" ON public."role";
CREATE POLICY "role_insert_policy" ON public."role" FOR INSERT TO authenticated WITH CHECK ((select private.is_admin()));
CREATE POLICY "role_update_policy" ON public."role" FOR UPDATE TO authenticated USING ((select private.is_admin())) WITH CHECK ((select private.is_admin()));
CREATE POLICY "role_delete_policy" ON public."role" FOR DELETE TO authenticated USING ((select private.is_admin()));
-- Table: public.salary_record
DROP POLICY IF EXISTS "salary_record_select_policy" ON public."salary_record";
CREATE POLICY "salary_record_select_policy" ON public."salary_record" FOR SELECT TO authenticated USING (((employee_id = (select private.get_employee_id())) OR (select private.is_admin())));
DROP POLICY IF EXISTS "salary_record_write_policy" ON public."salary_record";
CREATE POLICY "salary_record_insert_policy" ON public."salary_record" FOR INSERT TO authenticated WITH CHECK ((select private.is_admin()));
CREATE POLICY "salary_record_update_policy" ON public."salary_record" FOR UPDATE TO authenticated USING ((select private.is_admin())) WITH CHECK ((select private.is_admin()));
CREATE POLICY "salary_record_delete_policy" ON public."salary_record" FOR DELETE TO authenticated USING ((select private.is_admin()));
-- Table: public.size
DROP POLICY IF EXISTS "size_select_policy" ON public."size";
CREATE POLICY "size_select_policy" ON public."size" FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "size_write_policy" ON public."size";
CREATE POLICY "size_insert_policy" ON public."size" FOR INSERT TO authenticated WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "size_update_policy" ON public."size" FOR UPDATE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
CREATE POLICY "size_delete_policy" ON public."size" FOR DELETE TO authenticated USING (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.stock_reservation
DROP POLICY IF EXISTS "stock_reservation_delete_policy" ON public."stock_reservation";
CREATE POLICY "stock_reservation_delete_policy" ON public."stock_reservation" FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = stock_reservation.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "stock_reservation_insert_policy" ON public."stock_reservation";
CREATE POLICY "stock_reservation_insert_policy" ON public."stock_reservation" FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = stock_reservation.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "stock_reservation_select_policy" ON public."stock_reservation";
CREATE POLICY "stock_reservation_select_policy" ON public."stock_reservation" FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = stock_reservation.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
DROP POLICY IF EXISTS "stock_reservation_update_policy" ON public."stock_reservation";
CREATE POLICY "stock_reservation_update_policy" ON public."stock_reservation" FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = stock_reservation.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM pending_checkout pc
  WHERE ((pc.checkout_id = stock_reservation.checkout_id) AND ((pc.customer_id = (select private.get_customer_id())) OR (pc.customer_id IS NULL) OR (select private.is_admin()) OR (select private.is_employee()))))));
-- Table: public.supplier
DROP POLICY IF EXISTS "supplier_all_policy" ON public."supplier";
CREATE POLICY "supplier_all_policy" ON public."supplier" FOR ALL TO authenticated USING (((select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));
-- Table: public.user_addresses
DROP POLICY IF EXISTS "user_addresses_delete_policy" ON public."user_addresses";
CREATE POLICY "user_addresses_delete_policy" ON public."user_addresses" FOR DELETE TO authenticated USING (((customer_id = (select private.get_customer_id())) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "user_addresses_insert_policy" ON public."user_addresses";
CREATE POLICY "user_addresses_insert_policy" ON public."user_addresses" FOR INSERT TO authenticated WITH CHECK (((customer_id = (select private.get_customer_id())) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "user_addresses_select_policy" ON public."user_addresses";
CREATE POLICY "user_addresses_select_policy" ON public."user_addresses" FOR SELECT TO authenticated USING (((customer_id = (select private.get_customer_id())) OR (select private.is_admin()) OR (select private.is_employee())));
DROP POLICY IF EXISTS "user_addresses_update_policy" ON public."user_addresses";
CREATE POLICY "user_addresses_update_policy" ON public."user_addresses" FOR UPDATE TO authenticated USING (((customer_id = (select private.get_customer_id())) OR (select private.is_admin()) OR (select private.is_employee()))) WITH CHECK (((customer_id = (select private.get_customer_id())) OR (select private.is_admin()) OR (select private.is_employee())));
-- ============================================================================
-- STEP 4: ADD MISSING RLS LOOKUP INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS employee_commission_employee_id_idx ON public.employee_commission(employee_id);
CREATE INDEX IF NOT EXISTS user_addresses_customer_id_idx ON public.user_addresses(customer_id);

-- ============================================================================
-- STEP 5: DROP OLD PUBLIC SCHEMAS HELPER FUNCTIONS (AFTER POLICY UPDATES)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_customer_id();
DROP FUNCTION IF EXISTS public.get_employee_id();
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_customer();
DROP FUNCTION IF EXISTS public.is_employee();
