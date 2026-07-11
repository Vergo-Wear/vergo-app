-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.role (
  role_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_name text NOT NULL UNIQUE,
  CONSTRAINT role_pkey PRIMARY KEY (role_id)
);
CREATE TABLE public.branch (
  branch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  CONSTRAINT branch_pkey PRIMARY KEY (branch_id)
);
CREATE TABLE public.category (
  category_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  CONSTRAINT category_pkey PRIMARY KEY (category_id)
);
CREATE TABLE public.supplier (
  supplier_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  address text NOT NULL,
  CONSTRAINT supplier_pkey PRIMARY KEY (supplier_id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role_id uuid,
  username text UNIQUE,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(role_id)
);
CREATE TABLE public.employee (
  employee_id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid,
  branch_id uuid,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  address text,
  position text,
  salary numeric,
  hire_date date,
  CONSTRAINT employee_pkey PRIMARY KEY (employee_id),
  CONSTRAINT employee_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT employee_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id)
);
CREATE TABLE public.customer (
  customer_id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text NOT NULL UNIQUE,
  default_shipping_address text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customer_pkey PRIMARY KEY (customer_id),
  CONSTRAINT customer_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.attendance (
  attendance_id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid,
  date date NOT NULL,
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  status text,
  CONSTRAINT attendance_pkey PRIMARY KEY (attendance_id),
  CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.salary_record (
  salary_id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid,
  month date NOT NULL,
  basic_salary numeric NOT NULL,
  bonus numeric DEFAULT 0.00,
  deduction numeric DEFAULT 0.00,
  net_salary numeric NOT NULL,
  CONSTRAINT salary_record_pkey PRIMARY KEY (salary_id),
  CONSTRAINT salary_record_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.product (
  product_id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  supplier_id uuid,
  name text NOT NULL,
  description text,
  base_price numeric NOT NULL,
  status text DEFAULT 'active'::text,
  CONSTRAINT product_pkey PRIMARY KEY (product_id),
  CONSTRAINT product_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(category_id),
  CONSTRAINT product_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id)
);
CREATE TABLE public.product_variant (
  variant_id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  sku text NOT NULL UNIQUE,
  size text NOT NULL,
  color text NOT NULL,
  price_adjustment numeric DEFAULT 0.00,
  CONSTRAINT product_variant_pkey PRIMARY KEY (variant_id),
  CONSTRAINT product_variant_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id)
);
CREATE TABLE public.inventory (
  inventory_id uuid NOT NULL DEFAULT gen_random_uuid(),
  variant_id uuid,
  branch_id uuid,
  quantity integer DEFAULT 0 CHECK (quantity >= 0),
  reorder_level integer DEFAULT 10,
  last_updated timestamp with time zone DEFAULT now(),
  reserved_quantity integer DEFAULT 0 CHECK (reserved_quantity >= 0),
  CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id),
  CONSTRAINT inventory_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variant(variant_id),
  CONSTRAINT inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id)
);
CREATE TABLE public.cart (
  cart_id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  session_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cart_pkey PRIMARY KEY (cart_id),
  CONSTRAINT cart_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id)
);
CREATE TABLE public.cart_item (
  cart_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  cart_id uuid,
  variant_id uuid,
  quantity integer DEFAULT 1,
  CONSTRAINT cart_item_pkey PRIMARY KEY (cart_item_id),
  CONSTRAINT cart_item_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.cart(cart_id),
  CONSTRAINT cart_item_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variant(variant_id)
);
CREATE TABLE public.orders (
  order_id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  employee_id uuid,
  branch_id uuid,
  order_date timestamp with time zone DEFAULT now(),
  total_amount numeric NOT NULL,
  payment_method text NOT NULL,
  shipping_address text NOT NULL,
  order_status text DEFAULT 'pending'::text CHECK (order_status = ANY (ARRAY['Draft'::text, 'Pending Payment'::text, 'Pending Verification'::text, 'Ready to Process'::text, 'Claimed by Employee'::text, 'Preparing'::text, 'Ready'::text, 'Sent for Delivery'::text, 'Completed'::text, 'Cancelled'::text, 'Rejected'::text, 'Expired'::text])),
  product_total numeric NOT NULL DEFAULT 0.00,
  delivery_fee numeric NOT NULL DEFAULT 0.00,
  cod_amount numeric DEFAULT 0.00,
  CONSTRAINT orders_pkey PRIMARY KEY (order_id),
  CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id),
  CONSTRAINT orders_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id),
  CONSTRAINT orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branch(branch_id)
);
CREATE TABLE public.order_item (
  order_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  variant_id uuid,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  CONSTRAINT order_item_pkey PRIMARY KEY (order_item_id),
  CONSTRAINT order_item_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT order_item_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variant(variant_id)
);
CREATE TABLE public.delivery (
  delivery_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  assigned_employee_id uuid,
  delivery_status text DEFAULT 'pending'::text,
  delivered_at timestamp with time zone,
  CONSTRAINT delivery_pkey PRIMARY KEY (delivery_id),
  CONSTRAINT delivery_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT delivery_assigned_employee_id_fkey FOREIGN KEY (assigned_employee_id) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.notification (
  notification_id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  order_id uuid,
  message text NOT NULL,
  type text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'sent'::text,
  CONSTRAINT notification_pkey PRIMARY KEY (notification_id),
  CONSTRAINT notification_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id),
  CONSTRAINT notification_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id)
);
CREATE TABLE public.purchase_order (
  purchase_order_id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid,
  employee_id uuid,
  order_date timestamp with time zone DEFAULT now(),
  status text DEFAULT 'requested'::text,
  total_amount numeric NOT NULL,
  CONSTRAINT purchase_order_pkey PRIMARY KEY (purchase_order_id),
  CONSTRAINT purchase_order_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id),
  CONSTRAINT purchase_order_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.purchase_order_item (
  po_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid,
  variant_id uuid,
  quantity integer NOT NULL,
  cost_price numeric NOT NULL,
  CONSTRAINT purchase_order_item_pkey PRIMARY KEY (po_item_id),
  CONSTRAINT purchase_order_item_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_order(purchase_order_id),
  CONSTRAINT purchase_order_item_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variant(variant_id)
);
CREATE TABLE public.images (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  image_url text NOT NULL,
  title text,
  created_at timestamp without time zone DEFAULT now(),
  variant_id uuid,
  CONSTRAINT images_pkey PRIMARY KEY (id),
  CONSTRAINT images_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variant(variant_id)
);
CREATE TABLE public.delivery_fee_rules (
  rule_id uuid NOT NULL DEFAULT gen_random_uuid(),
  district text NOT NULL UNIQUE,
  fee_amount numeric NOT NULL,
  CONSTRAINT delivery_fee_rules_pkey PRIMARY KEY (rule_id)
);
CREATE TABLE public.user_addresses (
  address_id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  receiver_name text NOT NULL,
  phone text NOT NULL,
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL,
  district text NOT NULL,
  postal_code text,
  is_primary boolean DEFAULT false,
  CONSTRAINT user_addresses_pkey PRIMARY KEY (address_id),
  CONSTRAINT user_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(customer_id)
);
CREATE TABLE public.order_customer_details (
  detail_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  customer_type text NOT NULL CHECK (customer_type = ANY (ARRAY['registered'::text, 'guest'::text])),
  CONSTRAINT order_customer_details_pkey PRIMARY KEY (detail_id),
  CONSTRAINT ocd_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id)
);
CREATE TABLE public.order_shipping_details (
  shipping_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  receiver_name text NOT NULL,
  phone text NOT NULL,
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL,
  district text NOT NULL,
  postal_code text,
  delivery_note text,
  CONSTRAINT order_shipping_details_pkey PRIMARY KEY (shipping_id),
  CONSTRAINT osd_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id)
);
CREATE TABLE public.payment_proofs (
  proof_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  receipt_url text,
  uploaded_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'Pending Upload'::text CHECK (status = ANY (ARRAY['Pending Upload'::text, 'Pending Verification'::text, 'Approved'::text, 'Rejected'::text, 'Expired'::text])),
  admin_notes text,
  CONSTRAINT payment_proofs_pkey PRIMARY KEY (proof_id),
  CONSTRAINT payment_proofs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id)
);-- Reference SQL file (not used by Prisma migrations/generate)
-- Paste your database details/queries below.
