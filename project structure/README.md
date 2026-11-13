# Project Structure & Database Documentation

This folder contains the complete, up-to-date schema definitions, entity-relationship models, and architecture documentation for the **VERGO E-Commerce Platform** database.

---

## 📂 Documentation Files

1. **[`ER.md`](./ER.md)**  
   * **Purpose:** Complete database schema dictionary and security audit reference.
   * **Contents:** Detailed per-table breakdown for all 40 database tables (PostgreSQL/Supabase) including column names, data types, nullability, primary/foreign/unique constraints, identity properties, and complete Row Level Security (RLS) policies.

2. **[`DATABASE_ARCHITECTURE.md`](./DATABASE_ARCHITECTURE.md)**  
   * **Purpose:** Architectural overview and business domain guide.
   * **Contents:** Explains data flow, domain boundaries (IAM, Products & Variants, Order Pipeline, Fulfillment & Tracking, Multi-branch Inventory, Reviews, Notifications), normalization decisions, historical accuracy snapshotting, and operational workflows.

3. **[`er_diagram_dark_black_text.html`](./er_diagram_dark_black_text.html)**  
   * **Purpose:** Interactive graphical Entity-Relationship Diagram.
   * **Contents:** Renderable Mermaid.js diagram with high-contrast styling mapping all core tables and foreign key relationships across the system.

---

## 🏗️ Core Domains Overview

| Domain | Key Tables | Description |
|---|---|---|
| **Identity & Access** | `role`, `profiles`, `employee`, `customer`, `user_addresses` | Supabase `auth.users` bridge, RBAC roles, dual profile pattern. |
| **Catalog & Products** | `category`, `product`, `product_variant`, `color`, `size`, `images`, `supplier` | Normalized apparel variant modeling (color, size, adjustments, variant-level image galleries). |
| **Inventory & Locations** | `branch`, `inventory`, `stock_reservation`, `inventory_commitment` | Multi-branch stock allocation, transient checkout holds, hard order commitments. |
| **Cart & Pre-Checkout** | `cart`, `cart_item`, `pending_checkout`, `pending_checkout_item`, `pending_checkout_customer_details`, `pending_checkout_shipping_details`, `payment_proof` | Persistent carts and 2-phase checkout pipeline supporting manual bank-slip verification before order creation. |
| **Orders & Commerce** | `orders`, `order_item`, `order_customer_details`, `order_shipping_details`, `delivery_fee_rules` | Audited financial receipts snapshotting items, customer details, and shipping address. |
| **Fulfillment & Logistics** | `delivery`, `courier_shipper_profile`, `delivery_waybill`, `delivery_tracking_event`, `courier_pickup_request`, `courier_pickup_delivery` | Koombiyo / Citypak courier integrations, waybills, batch pickups, and tracking events. |
| **Operations & Reviews** | `attendance`, `employee_commission`, `notification`, `review`, `review_image` | Employee shift logging, order preparation commissions, system notifications, verified customer reviews. |
