# VERGO E-Commerce Platform: Database Architecture & Relationship Report

**Overview:** This document outlines the relational database architecture for the VERGO platform. It details the purpose of each table, how they connect, and the specific business value they provide. The schema is highly normalized, optimized for apparel retail, and designed to maintain historical financial accuracy.

---

## 1. Base Tables (The Independent Foundation)
These tables represent core physical or structural truths about the business. They have no foreign keys because they exist independently. This demonstrates strict database normalization (reducing data duplication).

* **`role`:** Defines system permissions (e.g., Admin, Customer, Manager). 
  * *Business Value:* Centralizes access control. Changing an admin's permissions happens once here, rather than updating every single user row.
* **`branch`:** Stores physical store or warehouse locations.
  * *Business Value:* If a store moves, the address is updated here once. Every employee and inventory record linked to this branch updates automatically via their relationship.
* **`category`:** Organizes the catalog (e.g., "Winter Wear", "Accessories").
  * *Business Value:* Powers the frontend UI navigation and allows for highly efficient product filtering.
* **`supplier`:** Stores vendor contact info for restocking.
  * *Business Value:* Isolates external B2B contacts from internal employee or customer data.

---

## 2. Identity & Access Management (The Security Layer)
This section bridges the gap between secure authentication and public user data.

* **`profiles`:** The master bridge table. It links securely to the authentication provider's hidden system (Supabase `auth.users`) via the `id` column.
  * *Business Value:* Keeps passwords and core security logic completely isolated from general business data, preventing accidental data leaks.
* **`employee` & `customer`:** These link back to `profiles` via a nullable `profile_id` foreign key. Note: the database does **not** enforce this as 1-to-1 (no unique constraint on `profile_id`) — treat it as app-level convention, not a DB guarantee.
  * *Business Value:* Separates operational logic. Customers require shipping addresses; employees require salaries and branch assignments. Splitting them avoids a massive, messy "Users" table filled with NULL columns.

---

## 3. HR Operations (Internal Management)
These tables track workforce logistics, ensuring the administrative backend is fully integrated with the commerce platform.

* **`attendance`:** Links to `employee` to log daily shifts (`check_in`, `check_out`).
  * *Business Value:* Automates time-tracking for payroll processing.
* **`salary_record`:** Links to `employee` to store monthly pay stubs.
  * *Business Value:* Creates a permanent financial audit trail for business expenses, calculating bonuses and deductions dynamically on a per-month basis.

---

## 4. Products & Inventory (The Core Engine)
This is the most critical logic for a clothing retailer. It distinctly separates the *concept* of a product from the *physical item* sitting on a shelf.

* **`product`:** Holds the universal details (Name, Description, `base_price`). Also carries a free-text `status` column (default `'active'`) that determines customer-facing visibility — there is no boolean "is_active" flag.
* **`product_variant`:** Links to `product`. Holds the specific SKU, Size, and Color, plus a `price_adjustment` (default `0.00`) applied on top of the product's `base_price`.
  * *Design Justification:* A "Graphic T-Shirt" is one product, but it comes in 3 sizes and 3 colors (9 variants). If this wasn't split, the product description would have to be typed 9 separate times. This architecture is highly optimized for apparel.
  * *Pricing:* the customer-facing **selling price is `product.base_price + product_variant.price_adjustment`** — there is no standalone price column on the variant itself.
* **`images`:** Links to `variant_id` (not `product_id`). Columns: `id` (bigint identity), `image_url`, `title`, `created_at`, `variant_id`.
  * *Business Value:* A 1-to-many relationship allowing a single colored shirt to have multiple photos (front, back, lifestyle). Note: there is **no `display_order` column** in the live schema — ordering, if needed, must be handled another way (e.g. `created_at` or `id`).
  * *Correction:* this table was previously documented here as `product_image` with a `display_order` column; neither matches the live database. A product's full image list is the union of all its variants' images, since images are not linked to `product` directly.
* **`inventory`:** The bridge between `product_variant` and `branch`. Columns: `quantity` (default 0), `reorder_level` (default 10), `reserved_quantity` (default 0), `last_updated`.
  * *Business Value:* Allows the system to track exact stock levels per location (e.g., knowing exactly how many "Large Red T-Shirts" are in the main warehouse versus a retail branch).
  * *Important:* there is **one inventory row per (variant, branch) pair**. A variant's total stock/reserved figures are the sum of `quantity`/`reserved_quantity` across all its branch rows, not a single value.

---

## 5. Shopping & Checkout (The Revenue Pipeline)
This structure handles the transition from a temporary shopping session to a permanent legal receipt.

* **`cart` & `cart_item`:** Links to `customer` (or uses `session_id` for guests) and `variant_id`.
  * *Business Value:* These are highly volatile tables. Items are added, removed, and deleted constantly. Separating carts from orders prevents the core financial database from getting clogged with abandoned checkouts.
* **`orders`:** The master receipt table linking the Customer, Employee (if processed manually), and Branch. `order_status` is a constrained enum (`Draft`, `Pending Payment`, `Pending Verification`, `Ready to Process`, `Claimed by Employee`, `Preparing`, `Ready`, `Sent for Delivery`, `Completed`, `Cancelled`, `Rejected`, `Expired`) reflecting the full manual-verification checkout flow, not just a simple pending/completed state. Also splits the total into `product_total`, `delivery_fee`, and `cod_amount`.
* **`order_item`:** Links the Order to the Product Variants.
  * *Design Justification (Historical Accuracy):* The `unit_price` and `subtotal` are copied here at the exact moment of checkout. Even though the product has a base price in the `product` table, copying it to the `order_item` ensures that if a shirt's price increases next year, past financial records remain completely accurate and unchanged.
* **`order_customer_details`:** 1-to-1 with `orders` (`order_id` is unique). Snapshots the buyer's name/email/phone at checkout time, plus `customer_type` (`registered` vs `guest`).
  * *Business Value:* Same historical-accuracy pattern as `order_item` pricing — guest checkouts have no `customer` row to reference, and even registered customers' contact details may change later, so the order keeps its own permanent copy.
* **`order_shipping_details`:** 1-to-1 with `orders`. Snapshots the delivery address (`receiver_name`, `address_line_1/2`, `city`, `district`, `postal_code`, `delivery_note`) independent of the customer's saved `user_addresses`, for the same audit-trail reason.
* **`payment_proofs`:** Links to `orders`. Tracks manual bank-transfer/receipt verification with `receipt_url`, `uploaded_at`, `expires_at`, and a `status` enum (`Pending Upload`, `Pending Verification`, `Approved`, `Rejected`, `Expired`), plus `admin_notes` for staff review.
  * *Business Value:* Supports a manual payment-verification workflow (e.g. bank deposit slips) alongside or instead of an automated payment gateway.
* **`delivery_fee_rules`:** Independent lookup table mapping `district` (unique) to a flat `fee_amount`.
  * *Business Value:* Centralizes delivery pricing by region so checkout can compute `delivery_fee` without hardcoding rates.
* **`user_addresses`:** Saved addresses per `customer`, with an `is_primary` flag.
  * *Business Value:* Lets returning customers check out faster by reusing a saved address, distinct from the per-order snapshot in `order_shipping_details`.

---

## 6. Fulfillment & Supply Chain (Logistics)
These tables handle what happens *after* a transaction occurs, both on the customer side and the B2B side.

* **`delivery`:** Links an `order_id` to an `employee_id` to track physical drop-offs.
* **`notification`:** A centralized system linking messages to specific customers and orders.
  * *Business Value:* Powers an internal inbox or automated event triggers (e.g., dispatching "Your order has shipped" emails).
* **`purchase_order` & `purchase_order_item`:** Links an Employee to a Supplier to buy more stock.
  * *Business Value:* Mirrors the customer ordering system, but for B2B restocks. It tracks exactly how much the business spent acquiring inventory, allowing for accurate profit margin calculations in the analytics dashboard.