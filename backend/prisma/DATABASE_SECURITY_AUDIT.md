# PostgreSQL & Supabase RLS Security Audit Report

## Executive Summary
This document records the database security audit, architectural improvements, policy restructuring, privilege hardening, and verification results conducted for the Vergo Wear application stack (Next.js, NestJS, Prisma, PostgreSQL, Supabase Auth).

The security remediation was designed to eliminate all Supabase Security Advisor warnings without altering production application workflows across customer accounts, employee operations, admin management, storefront browsing, orders, payments, inventory, or delivery lifecycle.

---

## 1. System Architecture & Identity Model

### Identity Relationships
```
auth.users.id
    │
    ▼
public.profiles.id
    │
    ├───────────► public.customer.profile_id
    │
    ├───────────► public.employee.profile_id
    │
    └───────────► public.notification.recipient_profile_id
```

### Resource Ownership Relationships
- `customer.profile_id` -> `profiles.id` -> `auth.users.id`
- `employee.profile_id` -> `profiles.id` -> `auth.users.id`
- `notification.recipient_profile_id` -> `profiles.id`
- `cart.customer_id` -> `customer.customer_id`
- `user_addresses.customer_id` -> `customer.customer_id`
- `orders.customer_id` -> `customer.customer_id`
- `review.customer_id` -> `customer.customer_id`
- `employee_commission.employee_id` -> `employee.employee_id`
- `salary_record.employee_id` -> `employee.employee_id`

---

## 2. Private Schema & RLS Helper Functions

### Schema Design
A dedicated non-exposed schema `private` was introduced to house row-level security helper functions:
```sql
CREATE SCHEMA IF NOT EXISTS private;
```

### Function Specifications
All RLS helper functions are compiled with `SECURITY DEFINER`, `STABLE` volatility, and `SET search_path = ''` to prevent search_path manipulation attacks:

| Function | Schema | Volatility | Security | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `private.get_user_role()` | `private` | `STABLE` | `SECURITY DEFINER` | Retrieves role name for current `auth.uid()` |
| `private.is_admin()` | `private` | `STABLE` | `SECURITY DEFINER` | Evaluates if authenticated user is `Admin` |
| `private.is_customer()` | `private` | `STABLE` | `SECURITY DEFINER` | Evaluates if authenticated user is `Customer` |
| `private.is_employee()` | `private` | `STABLE` | `SECURITY DEFINER` | Evaluates if authenticated user is `Employee` |
| `private.get_customer_id()` | `private` | `STABLE` | `SECURITY DEFINER` | Resolves `customer_id` for current `auth.uid()` |
| `private.get_employee_id()` | `private` | `STABLE` | `SECURITY DEFINER` | Resolves `employee_id` for current `auth.uid()` |

### Function Privileges & REST Exposure
- `GRANT USAGE ON SCHEMA private TO authenticated;`
- `REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;`
- `REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM anon;`
- `GRANT EXECUTE ON FUNCTION private.<func>() TO authenticated;`
- Legacy functions in `public` schema (`public.get_customer_id()`, `public.is_admin()`, etc.) were dropped.
- **REST RPC Result**: Calling `/rest/v1/rpc/is_admin` or `/rest/v1/rpc/get_customer_id` via Supabase REST API returns **HTTP 404 Not Found**.

---

## 3. RLS Policy Optimization & Overlap Fixes

### Auth RLS Initialization Plan Fix
Statement-constant identity checks were refactored into subqueries to allow PostgreSQL to evaluate function calls once per statement instead of once per row:
```sql
-- Before (Per-row evaluation)
profile_id = auth.uid()
is_admin()

-- After (Statement-constant evaluation)
profile_id = (select auth.uid())
(select private.is_admin())
```

### Multiple Permissive Policies Fix
Broad `FOR ALL` write policies were split into operation-specific policies (`FOR INSERT`, `FOR UPDATE`, `FOR DELETE`) for target tables:
- `branch`
- `category`
- `color`
- `delivery_fee_rules`
- `delivery_tracking_event`
- `employee_commission`
- `images`
- `product`
- `product_variant`
- `role`
- `salary_record`
- `size`

This eliminated duplicate permissive `SELECT` rules while maintaining full administrative mutation protection.

### Contact Message Anti-Abuse
- Removed direct `anon` REST `INSERT` policy (`contact_message_insert_policy`).
- Public Contact Us form submissions flow through NestJS backend `POST /contact` via Prisma/trusted database connection with `class-validator` payload validation and rate limiting. Direct REST inserts as `anon` return **HTTP 401 Unauthorized**.

---

## 4. Performance Indexing

Missing indexes for foreign key lookup columns used in RLS policies were created:
1. `employee_commission_employee_id_idx` on `public.employee_commission(employee_id)`
2. `user_addresses_customer_id_idx` on `public.user_addresses(customer_id)`

Aligned models in `schema.prisma`:
```prisma
model EmployeeCommission {
  ...
  @@index([employeeId])
}

model UserAddress {
  ...
  @@index([customerId])
}
```

---

## 5. Security Advisor Resolution Matrix

| Issue Category | Target | Resolution | Result |
| :--- | :--- | :--- | :--- |
| **Auth RLS Initialization Plan** | `profiles`, `employee`, `customer`, `notification` | Converted per-row calls to `(select auth.uid())` and `(select private.*)` | **Resolved** |
| **Multiple Permissive Policies** | 12 tables (`product`, `category`, `color`, `branch`, etc.) | Replaced `FOR ALL` write policies with explicit `INSERT`, `UPDATE`, `DELETE` policies | **Resolved** (0 overlaps) |
| **SECURITY DEFINER Exposure** | `get_customer_id`, `get_employee_id`, `get_user_role`, `is_admin`, `is_customer`, `is_employee` | Moved to `private` schema, revoked `anon`/`PUBLIC`, dropped `public` functions | **Resolved** (HTTP 404 on RPC) |
| **RLS Policy Always True** | `contact_message_insert_policy` | Dropped direct `anon` REST policy; routed submissions through NestJS `POST /contact` | **Resolved** (HTTP 401 on anon REST write) |
| **Leaked Password Protection** | Supabase Auth configuration | Configured via Supabase Dashboard -> Authentication -> Auth Settings -> Password Protection | **Documented** |

---

## 6. Verification Results

| Suite / Test | Command | Output / Status |
| :--- | :--- | :--- |
| **Prisma Schema Validation** | `npx prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` |
| **Backend NestJS Build** | `npm --prefix backend run build` | `Exit Code 0 (Success)` |
| **Frontend Next.js Build** | `npm --prefix frontend run build` | `Compiled 35/35 pages successfully (0 errors)` |
| **RPC REST API Penetration Check** | `GET /rest/v1/rpc/is_admin` | `HTTP 404 Not Found` |
| **RPC REST API Penetration Check** | `GET /rest/v1/rpc/get_customer_id` | `HTTP 404 Not Found` |
| **Anon Direct Write Check** | `POST /rest/v1/contact_message` | `HTTP 401 Unauthorized` |
| **Public Storefront Read** | `GET /rest/v1/product` | `HTTP 200 OK` |
| **NestJS Backend Contact Form** | `POST http://localhost:3001/contact` | `HTTP 201 Created` |
