# VERGO E-Commerce Platform: Database Architecture & Relationship Report

**Overview:** This document outlines the relational database architecture for the VERGO platform. It details the purpose of each table, domain boundaries, data flow, and the specific business value they provide based on the live PostgreSQL/Supabase schema defined in [`ER.md`](./ER.md) and [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma). The schema is highly normalized, optimized for apparel retail, and designed to guarantee historical financial accuracy and robust logistics tracking.

---

## 1. Base Tables & Core Structural Lookups
These tables represent core physical or structural entities in the business with minimal external dependencies.

* **`role`:** Defines system-level access roles (e.g. Admin, Customer, Employee/Manager).
  * *Business Value:* Centralizes access control. Profiles reference roles to enforce application permissions and Row-Level Security (RLS).
* **`branch`:** Stores physical store or warehouse dispatch locations (`name`, `address`, `phone`).
  * *Business Value:* Multi-branch fulfillment support. Inventory quantities and courier pickup locations map directly to specific branches.
* **`category`:** Hierarchical categorization for clothing and accessories catalog navigation.
* **`color`:** Normalized apparel color palette (`color_id`, `name`, `hex_code`, `display_order`, `image_url`, `status`).
* **`size`:** Normalized apparel sizing standard (`size_id`, `name`, `display_order`, `status`).
* **`supplier`:** External B2B apparel suppliers and vendor contacts (`name`, `phone`, `email` [UNIQUE], `address`, `status`).
* **`delivery_fee_rules`:** Regional delivery rate card mapping `district` (UNIQUE) with `base_delivery_fee`, item volume limits, and additional weight/item surcharges.

---

## 2. Identity & Access Management (IAM Layer)
Separates authentication identity from specialized business personas.

* **`profiles`:** The master bridge table connecting directly to Supabase authentication (`auth.users.id`). Stores username, active/inactive status, password reset flags, and audit timestamps.
* **`employee`:** 1-to-1 extension of `profiles` via `@unique profile_id`. Carries operational workforce fields: assigned `branch_id`, `position`, `salary`, `hire_date`, `availability_status`, `commission_per_parcel`, and `created_by_profile_id`.
* **`customer`:** 1-to-1 extension of `profiles` via `@unique profile_id`. Holds customer identity, `contact_phone`, and `contact_email` (UNIQUE).
* **`user_addresses`:** Saved multi-address book for registered customers (`customer_id`, recipient name, phone, address lines, district, city, postal code, `is_primary`).

---

## 3. Product Catalog & Apparel Variants
Optimized for fashion e-commerce with two-tier product-variant modeling.

* **`product`:** Master catalog item representing the design/model (`category_id`, `supplier_id`, `name`, `description`, `base_price`, `status`, `is_sold_out`).
* **`product_variant`:** The sellable SKU representing a specific (Product + Color + Size) combination:
  * Foreign keys: `product_id`, `color_id`, `size_id`.
  * Pricing: Customer selling price is `product.base_price + product_variant.price_adjustment`.
* **`images`:** Variant-specific gallery images (`variant_id`, `image_url`). Allows each colorway of a shirt to have its own gallery of lifestyle and product shots.

---

## 4. Multi-Branch Inventory & Stock Lifecycle
Guarantees inventory integrity from initial browsing through checkout hold and final dispatch.

* **`inventory`:** Per-variant, per-branch stock balance (`variant_id`, `branch_id`, `quantity`, `reorder_level`, `last_updated`, `employee_id`).
* **`stock_reservation`:** Ephemeral stock holds created during the checkout process (`checkout_id`, `inventory_id`, `quantity`, `expires_at`, `status`). Prevents overselling during payment submission without permanently decrementing warehouse stock.
* **`inventory_commitment`:** Hard deduction linked to confirmed orders (`order_item_id`, `inventory_id`, `quantity`, `committed_at`, `restored_at`, `restore_reason`). Provides an audit trail if an order is cancelled or restocked.

---

## 5. Shopping Cart & 2-Phase Checkout Pipeline
A resilient transaction pipeline designed for both instant payment and manual bank-slip verification.

### Phase A: Pre-Checkout & Payment Review
1. **`cart` & `cart_item`:** Active shopping carts linked to registered customers.
2. **`pending_checkout`:** Checkout session initiated by a customer (or guest). Holds pricing snapshots (`product_total`, `delivery_fee`, `total_amount`), payment method, hold expiration (`expires_at`), and verification status (`Pending Upload`, `Pending Verification`, `Approved`, `Rejected`, `Expired`).
3. **`pending_checkout_item`:** Line items reserved for the pending checkout session (`variant_id`, `quantity`, `unit_price`).
4. **`pending_checkout_customer_details`:** Snapshots buyer contact info (`first_name`, `last_name`, `email`, `phone`).
5. **`pending_checkout_shipping_details`:** Snapshots intended delivery location for the session.
6. **`payment_proof`:** Tracks uploaded bank transfer slips/receipts (`checkout_id`, `file_url`, `file_name`, `mime_type`, `file_size_bytes`, `reviewed_by_profile_id`, `rejection_reason`).

### Phase B: Confirmed Orders (Audited Financial Ledger)
Once payment is verified or COD is placed:
* **`orders`:** Permanent order record referencing `customer_id`, assigned `employee_id`, and `branch_id`. Tracks timestamped stage transitions (`order_date`, `claimed_at`, `preparing_at`, `parcel_ready_at`, `sent_at`, `delivered_at`, `completed_at`).
* **`order_item`:** Permanent line-item ledger with immutable `unit_price` and `subtotal`.
* **`order_customer_details`:** Permanent 1-to-1 snapshot of customer details at time of order creation.
* **`order_shipping_details`:** Permanent 1-to-1 snapshot of delivery address, recipient, and delivery notes.

---

## 6. Courier Integration & Delivery Logistics
Built for third-party courier APIs (e.g. Koombiyo, Citypak) and fulfillment tracking.

* **`delivery`:** Main delivery record linked 1-to-1 with `orders`. Contains tracking numbers (`waybill_number`, `courier_reference`, `shipment_reference`), package dimensions/weight, COD collection amounts, delivery status, and Proof of Delivery (`pod_image_url`, receiver NIC/name).
* **`courier_shipper_profile`:** Shipper profile and warehouse pickup address configurations per courier and branch.
* **`delivery_waybill`:** Waybill PDF or label generation audit logs (`delivery_id`, `waybill_number`, `waybill_url`, `generated_at`).
* **`delivery_tracking_event`:** Chronological tracking checkpoints received via courier webhooks or polling (`delivery_id`, `event_time`, `status_code`, `status_description`, `location`).
* **`courier_pickup_request` & `courier_pickup_delivery`:** Batched courier manifest requests scheduling driver dispatch for multiple parcels.

---

## 7. Workforce Management, Commissions & Reviews
* **`attendance`:** Daily employee time and attendance log (`employee_id`, `check_in`, `check_out`, `status`).
* **`employee_commission`:** Tracks commission payouts awarded to employees per fulfilled order (`employee_id`, `order_id`, `rate_used`, `commission_amount`, `status`, `paid_at`).
* **`review` & `review_image`:** Post-purchase product reviews linked to specific verified order items (`order_item_id`, `product_id`, `customer_id`, `rating`, `comment`, `is_hidden`).
* **`notification`:** Multi-channel notification dispatch records (Email, SMS, In-app) linked to `recipient_profile_id`, `order_id`, or `checkout_id`.
