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
* **`employee` & `customer`:** These are child tables of `profiles` (enforced via 1-to-1 unique constraints). 
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

* **`product`:** Holds the universal details (Name, Description, Base Price). 
* **`product_variant`:** Links to `product`. Holds the specific SKU, Size, and Color. 
  * *Design Justification:* A "Graphic T-Shirt" is one product, but it comes in 3 sizes and 3 colors (9 variants). If this wasn't split, the product description would have to be typed 9 separate times. This architecture is highly optimized for apparel.
* **`product_image`:** Links to `variant_id`. 
  * *Business Value:* A 1-to-many relationship allowing a single colored shirt to have multiple photos (front, back, lifestyle) organized by `display_order` for the frontend carousel.
* **`inventory`:** The bridge between `product_variant` and `branch`. 
  * *Business Value:* Allows the system to track exact stock levels per location (e.g., knowing exactly how many "Large Red T-Shirts" are in the main warehouse versus a retail branch).

---

## 5. Shopping & Checkout (The Revenue Pipeline)
This structure handles the transition from a temporary shopping session to a permanent legal receipt.

* **`cart` & `cart_item`:** Links to `customer` (or uses `session_id` for guests) and `variant_id`.
  * *Business Value:* These are highly volatile tables. Items are added, removed, and deleted constantly. Separating carts from orders prevents the core financial database from getting clogged with abandoned checkouts.
* **`orders`:** The master receipt table linking the Customer, Employee (if processed manually), and Branch.
* **`order_item`:** Links the Order to the Product Variants.
  * *Design Justification (Historical Accuracy):* The `unit_price` and `subtotal` are copied here at the exact moment of checkout. Even though the product has a base price in the `product` table, copying it to the `order_item` ensures that if a shirt's price increases next year, past financial records remain completely accurate and unchanged.

---

## 6. Fulfillment & Supply Chain (Logistics)
These tables handle what happens *after* a transaction occurs, both on the customer side and the B2B side.

* **`delivery`:** Links an `order_id` to an `employee_id` to track physical drop-offs.
* **`notification`:** A centralized system linking messages to specific customers and orders.
  * *Business Value:* Powers an internal inbox or automated event triggers (e.g., dispatching "Your order has shipped" emails).
* **`purchase_order` & `purchase_order_item`:** Links an Employee to a Supplier to buy more stock.
  * *Business Value:* Mirrors the customer ordering system, but for B2B restocks. It tracks exactly how much the business spent acquiring inventory, allowing for accurate profit margin calculations in the analytics dashboard.