# VERGO Database Schema Reference

Source of truth: live Supabase Postgres schema (as of 2026-07-11), pasted directly
from the database — not the aspirational ER diagram in
`project structure/DATABASE_ARCHITECTURE.md`, which has drifted (e.g. it describes
a `product_image` table with a `display_order` column; the real table is `images`
with no such column). If the two ever disagree, this file and `schema.prisma` win.

Only `Category`, `Supplier`, `Product`, `ProductVariant`, `Inventory`, and `Images`
are currently modeled in `schema.prisma` (added for the Product Catalogue module).
Everything else below exists in the live database but has no Prisma model yet —
add one the same way (`@map`/`@@map`, `@db.Uuid`, `dbgenerated("gen_random_uuid()")`)
before querying it via Prisma.

## Base / independent tables

- **`role`** — `role_id` (uuid, PK), `role_name` (text, unique)
- **`branch`** — `branch_id` (uuid, PK), `name`, `address`, `phone` (all text, not null)
- **`category`** — `category_id` (uuid, PK), `name` (text, unique), `description` (text, nullable)
- **`supplier`** — `supplier_id` (uuid, PK), `name`, `phone`, `email`, `address` (all text, not null)

## Identity / access

- **`profiles`** — `id` (uuid, PK, FK → `auth.users.id`), `role_id` (FK → `role`), `username` (unique), `status` (default `'active'`), `created_at`
- **`employee`** — `employee_id` (PK), `profile_id` (FK → `profiles`), `branch_id` (FK → `branch`), `first_name`, `last_name`, `phone`, `address`, `position`, `salary` (numeric), `hire_date`
- **`customer`** — `customer_id` (PK), `profile_id` (FK → `profiles`), `first_name`, `last_name`, `phone`, `email` (unique, not null), `default_shipping_address`, `created_at`

## HR

- **`attendance`** — `attendance_id` (PK), `employee_id` (FK), `date`, `check_in`, `check_out`, `status`
- **`salary_record`** — `salary_id` (PK), `employee_id` (FK), `month` (date), `basic_salary`, `bonus` (default 0), `deduction` (default 0), `net_salary`

## Product catalogue & inventory

- **`product`** — `product_id` (PK), `category_id` (FK → `category`, nullable), `supplier_id` (FK → `supplier`, nullable), `name` (not null), `description`, `base_price` (numeric, not null), `status` (default `'active'`)
- **`product_variant`** — `variant_id` (PK), `product_id` (FK → `product`, nullable), `sku` (unique, not null), `size` (not null), `color` (not null), `price_adjustment` (numeric, default 0.00)
  - **Selling price = `product.base_price + product_variant.price_adjustment`** — there is no standalone price column on the variant.
- **`inventory`** — `inventory_id` (PK), `variant_id` (FK → `product_variant`, nullable), `branch_id` (FK → `branch`, nullable), `quantity` (default 0, `>= 0`), `reorder_level` (default 10), `last_updated`, `reserved_quantity` (default 0, `>= 0`)
  - **One row per (variant, branch)** — a variant's total stock is the sum of `quantity` across all its branch rows, not a single row. Same for `reserved_quantity`.
- **`images`** — `id` (bigint identity, PK), `image_url` (not null), `title` (nullable), `created_at`, `variant_id` (FK → `product_variant`, nullable)
  - **Images belong to a variant, not directly to a product.** A product's image list = the union of its variants' images. There is no `product_id` column and no `display_order`.

## Shopping & checkout

- **`cart`** — `cart_id` (PK), `customer_id` (FK, nullable — null for guest via `session_id`), `session_id`, `created_at`, `updated_at`
- **`cart_item`** — `cart_item_id` (PK), `cart_id` (FK), `variant_id` (FK → `product_variant`), `quantity` (default 1)
- **`orders`** — `order_id` (PK), `customer_id` (FK, nullable), `employee_id` (FK, nullable), `branch_id` (FK, nullable), `order_date`, `total_amount`, `payment_method`, `shipping_address`, `order_status` (CHECK enum: `Draft`, `Pending Payment`, `Pending Verification`, `Ready to Process`, `Claimed by Employee`, `Preparing`, `Ready`, `Sent for Delivery`, `Completed`, `Cancelled`, `Rejected`, `Expired`; default `'pending'` — note the default is not itself a valid enum value), `product_total` (default 0), `delivery_fee` (default 0), `cod_amount` (default 0)
- **`order_item`** — `order_item_id` (PK), `order_id` (FK), `variant_id` (FK → `product_variant`), `quantity`, `unit_price`, `subtotal`
- **`order_customer_details`** — `detail_id` (PK), `order_id` (FK, unique — 1:1), `first_name`, `last_name`, `email`, `phone`, `customer_type` (CHECK: `registered` | `guest`)
- **`order_shipping_details`** — `shipping_id` (PK), `order_id` (FK, unique — 1:1), `receiver_name`, `phone`, `address_line_1`, `address_line_2`, `city`, `district`, `postal_code`, `delivery_note`
- **`payment_proofs`** — `proof_id` (PK), `order_id` (FK), `receipt_url`, `uploaded_at`, `expires_at` (not null), `status` (CHECK: `Pending Upload`, `Pending Verification`, `Approved`, `Rejected`, `Expired`; default `'Pending Upload'`), `admin_notes`
- **`delivery`** — `delivery_id` (PK), `order_id` (FK), `assigned_employee_id` (FK → `employee`), `delivery_status` (default `'pending'`), `delivered_at`
- **`delivery_fee_rules`** — `rule_id` (PK), `district` (unique, not null), `fee_amount`
- **`user_addresses`** — `address_id` (PK), `customer_id` (FK, not null), `receiver_name`, `phone`, `address_line_1`, `address_line_2`, `city`, `district`, `postal_code`, `is_primary` (default false)
- **`notification`** — `notification_id` (PK), `customer_id` (FK, nullable), `order_id` (FK, nullable), `message`, `type`, `sent_at`, `status` (default `'sent'`)

## Procurement

- **`purchase_order`** — `purchase_order_id` (PK), `supplier_id` (FK), `employee_id` (FK), `order_date`, `status` (default `'requested'`), `total_amount`
- **`purchase_order_item`** — `po_item_id` (PK), `purchase_order_id` (FK), `variant_id` (FK → `product_variant`), `quantity`, `cost_price`

## Relationship summary

```
category ──┐
supplier ──┼──< product ──< product_variant ──< inventory >── branch
           │                       │
           │                       └──< images
           │
role ──< profiles ──< employee ──< attendance, salary_record, delivery(assigned)
                  └──< customer ──< cart ──< cart_item >── product_variant
                                └──< orders ──< order_item >── product_variant
                                            ├──1:1─ order_customer_details
                                            ├──1:1─ order_shipping_details
                                            ├──< payment_proofs
                                            ├──< delivery
                                            └──< notification
                                └──< user_addresses

supplier ──< purchase_order ──< purchase_order_item >── product_variant
```

## Gotchas for future work

- **Variant, not product, is the unit of inventory, price, and images.** Never key stock or photos off `product_id` directly.
- **Inventory is per-branch.** Aggregating to a single "total stock" number always means summing across `branch_id` rows for a given `variant_id`.
- **`product.status` is free-text (default `'active'`), not a boolean.** Filter with `status = 'active'`, don't assume other values are enumerated anywhere.
- Several FKs are nullable (`product.category_id`, `product.supplier_id`, `product_variant.product_id`, `inventory.variant_id`, `images.variant_id`, etc.) — always handle the orphaned/null case rather than assuming the relation exists.
