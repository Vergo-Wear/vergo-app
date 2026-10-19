# Vergo Wear - Test Cases & Quality Assurance Document
**Course:** Team Software Project (CSC304S3 / CSC304G3)  
**System:** Vergo Wear Custom Apparel & E-Commerce Platform  
**Document Version:** 1.0.0  
**Test Frameworks:** Jest, Supertest, React Testing Tools  

---

## Table of Contents
1. [Testing Strategy & Quality Objectives](#1-testing-strategy--quality-objectives)
2. [Automated Unit & Integration Test Suites (Jest)](#2-automated-unit--integration-test-suites-jest)
3. [Comprehensive Manual & End-to-End Test Matrix](#3-comprehensive-manual--end-to-end-test-matrix)
   - Module 1: Authentication & Role Authorization
   - Module 2: Product Catalogue & Variant Filtering
   - Module 3: Cart & Multi-Branch Stock Reservation
   - Module 4: Order Creation & Checkout Flow
   - Module 5: Payment Proof Upload & Administrative Approval
   - Module 6: Employee Fulfillment & Order Claiming
   - Module 7: Delivery Logistics & Webhook Handlers
   - Module 8: Reviews & Moderation
4. [Performance, Concurrency & Security Testing](#4-performance-concurrency--security-testing)
5. [Bug Tracking, Regression & Mitigation Ledger](#5-bug-tracking-regression--mitigation-ledger)

---

## 1. Testing Strategy & Quality Objectives

Quality assurance for Vergo Wear follows the standard Testing Pyramid:
- **Unit Testing (Automated):** Verifies business logic in individual NestJS service providers and utility functions using Jest with isolated dependency mocks.
- **Integration Testing (Automated):** Verifies interaction between controllers, validation pipes, Prisma database models, and external APIs (Supabase, Cloudinary, Courier).
- **End-to-End (E2E) & System Testing:** Verifies complete multi-step user workflows across the frontend and backend.
- **Acceptance & Manual Regression Testing:** Verifies UI responsive behavior across mobile viewports, cross-browser compatibility, and physical workshop operations.

---

## 2. Automated Unit & Integration Test Suites (Jest)

The project includes 14 automated spec test suites implemented in TypeScript:

| Test Suite File | Tested Service / Component | Primary Assertions |
| :--- | :--- | :--- |
| `auth.spec.ts` | `AuthService`, `SupabaseService` | User registration, password validation, role extraction, token verification. |
| `product-catalogue.service.spec.ts`| `ProductCatalogueService` | Category filtering, variant price calculations, SKU generation. |
| `cart.service.spec.ts` | `CartService` | Customer cart insertion, quantity updates, total calculation, item removal. |
| `orders.service.spec.ts` | `OrdersService` | Order placement, immutable snapshot creation, status transitions. |
| `stock-reservation.service.spec.ts`| `StockReservationService` | Atomic check-and-lock, rollback on failure, release of expired stock. |
| `payment-proof.service.spec.ts` | `PaymentProofService` | Slip upload storage, 24h expiration timestamping, admin approve/reject actions. |
| `delivery-fees.service.spec.ts` | `DeliveryFeesService` | District rule resolution, fallback rates, free shipping thresholds. |
| `employees.service.spec.ts` | `EmployeesService` | Order claiming concurrency lock, fulfillment milestone advancement. |
| `admin.service.spec.ts` | `AdminService` | Revenue aggregation, employee commission math, low-stock threshold query. |
| `reviews.service.spec.ts` | `ReviewsService` | Verified-order purchase check, rating average calculation, moderation filters. |
| `addresses.service.spec.ts` | `AddressesService` | Address book insertion, partial unique index enforcement (single primary address). |
| `notifications.service.spec.ts` | `NotificationsService` | Email template compilation, message payload formatting, delivery status. |
| `user-role.spec.ts` | `UserRoleService` | Role mapping, guard decorator validation. |
| `app.controller.spec.ts` | `AppController` | Server health check, uptime, version response. |

### Running the Automated Tests
```bash
# Run all unit tests
cd backend
npm run test

# Run tests with code coverage report
npm run test:cov

# Run End-to-End integration tests
npm run test:e2e
```

---

## 3. Comprehensive Manual & End-to-End Test Matrix

### Module 1: Authentication & Role Authorization

| Test Case ID | Test Scenario | Preconditions | Execution Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-01** | Successful Customer Registration | Valid unused email | 1. Navigate to `/auth/register`<br>2. Fill name, phone, valid email, strong password<br>3. Click "Create Account" | Account created in Supabase Auth and `profiles` table with role `customer`. Redirected to login with confirmation. | **PASS** |
| **TC-AUTH-02** | Weak Password Rejection | Registration page open | 1. Enter email `test@test.com`<br>2. Enter password `123`<br>3. Submit form | Validation error displayed: Password must contain at least 8 characters, 1 number, and 1 symbol. | **PASS** |
| **TC-AUTH-03** | Customer Login & JWT Storage | Registered account exists | 1. Enter valid email and password at `/auth/login`<br>2. Click Sign In | 200 OK returned; JWT access token saved in browser session; user redirected to storefront or previous page. | **PASS** |
| **TC-AUTH-04** | Role-Based Guard Enforcement (Unauthorized Access) | Logged in as `customer` | 1. Attempt to open `http://localhost:3000/admin`<br>2. Send direct `GET /admin/analytics` via Postman with Customer token | Next.js middleware redirects user away; Backend returns `403 ForbiddenException`. | **PASS** |

---

### Module 2: Product Catalogue & Variant Filtering

| Test Case ID | Test Scenario | Preconditions | Execution Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CAT-01** | Category Filtering | Multiple categories exist | 1. Open `/collection`<br>2. Click "Hoodies" category pill | Product grid reloads showing only products assigned to the "Hoodies" category. | **PASS** |
| **TC-CAT-02** | Dynamic Variant Pricing | Variant has price adjustment | 1. Open product page with Size XXL (+Rs. 300)<br>2. Select Size XXL | Displayed price dynamically updates from base price (Rs. 7500) to Rs. 7800. | **PASS** |
| **TC-CAT-03** | Out-of-Stock Indicator | Variant has 0 inventory across branches | 1. Select a variant where `quantity == 0` | "Add to Cart" button is disabled and displays "Sold Out". | **PASS** |

---

### Module 3: Cart & Multi-Branch Stock Reservation

| Test Case ID | Test Scenario | Preconditions | Execution Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CART-01** | Add to Persistent Cart | User authenticated | 1. Select Size M, Color Black<br>2. Click "Add to Cart" | Item added; cart badge counter increments; record created in `cart_item` database table. | **PASS** |
| **TC-CART-02** | Quantity Modification | Item in cart | 1. Navigate to `/cart`<br>2. Increase item quantity from 1 to 3 | Subtotal recalculates instantly; updated quantity reflected in database. | **PASS** |
| **TC-CART-03** | Guest Cart Session Persistence | User is unauthenticated | 1. Add item to cart as guest<br>2. Navigate between pages | Cart persists in browser session storage without error. | **PASS** |

---

### Module 4: Order Creation & Checkout Flow

| Test Case ID | Test Scenario | Preconditions | Execution Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ORD-01** | District-Based Delivery Fee Calculation | Items in cart | 1. Proceed to `/checkout/shipping`<br>2. Select District "Jaffna"<br>3. Change District to "Colombo" | Delivery fee updates dynamically according to `delivery_fee_rules` table. | **PASS** |
| **TC-ORD-02** | Cash on Delivery (COD) Placement | Checkout form filled | 1. Select "Cash on Delivery"<br>2. Click "Complete Order" | Order created with status `Ready to Process`; stock decremented immediately; order invoice email sent. | **PASS** |
| **TC-ORD-03** | Bank Transfer Placement & Stock Lock | Checkout form filled | 1. Select "Bank Transfer"<br>2. Click "Complete Order" | Order created with status `Pending Payment`; stock moved to `reserved_quantity`; 24-hour expiration timer started. | **PASS** |
| **TC-ORD-04** | Immutable Address Snapshot | Order placed | 1. Customer later edits their saved address in `/profile` | Historical order retains original checkout address in `order_shipping_details`. | **PASS** |

---

### Module 5: Payment Proof Upload & Administrative Approval

| Test Case ID | Test Scenario | Preconditions | Execution Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PAY-01** | Upload Bank Deposit Slip | Order in `Pending Payment` | 1. Open `/profile/orders/[id]`<br>2. Attach valid JPEG receipt image<br>3. Click Submit | Slip uploaded to Cloudinary; `payment_proofs` record created; order status changes to `Pending Verification`. | **PASS** |
| **TC-PAY-02** | Invalid File Format Rejection | Order in `Pending Payment` | 1. Attempt to upload a `.exe` or `.txt` file | Upload rejected with error "Only JPG, PNG, and PDF receipts are accepted". | **PASS** |
| **TC-PAY-03** | Admin Approves Payment Slip | Slip in `Pending Verification` | 1. Admin navigates to `/admin/orders`<br>2. Inspects slip preview<br>3. Clicks "Approve" | Status updates to `Ready to Process`; reserved stock permanently finalized; customer notified. | **PASS** |
| **TC-PAY-04** | Automatic Slip Expiration & Stock Restock | 24 hours passed without slip upload | 1. Scheduled cron job runs | Order status changes to `Expired`; reserved stock is returned to available `quantity`. | **PASS** |

---

### Module 6: Employee Fulfillment & Order Claiming

| Test Case ID | Test Scenario | Preconditions | Execution Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-EMP-01** | View Unclaimed Orders | Logged in as `employee` | 1. Open `/employee/orders` | Orders with status `Ready to Process` are listed chronologically. | **PASS** |
| **TC-EMP-02** | Claim Order Concurrency Lock | Order is unclaimed | 1. Employee A clicks "Claim Order"<br>2. Employee B simultaneously attempts to claim same order | Order assigned to Employee A (`Claimed by Employee`); Employee B receives notice that order is already claimed. | **PASS** |
| **TC-EMP-03** | Fulfillment Milestone Advancement | Order claimed by employee | 1. Open `/employee/product-prep`<br>2. Check off items and click "Ready for Dispatch" | Order status advances to `Ready`. | **PASS** |

---

### Module 7: Delivery Logistics & Webhook Handlers

| Test Case ID | Test Scenario | Preconditions | Execution Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-LOG-01** | Consignment Manifest Generation | Order in `Ready` status | 1. Open `/employee/delivery-prep`<br>2. Click "Dispatch to Courier" | Airway bill tracking number generated; status moves to `Sent for Delivery`. | **PASS** |
| **TC-LOG-02** | Courier Delivery Webhook | Package in transit | 1. Citypak sends inbound webhook `DELIVERED` | Order status updates to `Completed`; customer tracking screen displays "Delivered". | **PASS** |

---

### Module 8: Reviews & Moderation

| Test Case ID | Test Scenario | Preconditions | Execution Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-REV-01** | Verified Purchase Review Submission | Customer has `Completed` order | 1. Open product page<br>2. Submit 5-star rating with review text | Review saved with status `pending_moderation`. | **PASS** |
| **TC-REV-02** | Unverified User Review Blocking | Customer has NOT bought item | 1. Attempt to post review on unpurchased product | Server rejects submission with error "Only verified buyers can leave a review". | **PASS** |
| **TC-REV-03** | Admin Review Approval | Pending review exists | 1. Admin opens `/admin/feedbacks`<br>2. Clicks "Approve" | Review becomes visible to public shoppers on storefront product page. | **PASS** |

---

## 4. Performance, Concurrency & Security Testing

### 4.1 Concurrent Purchase Simulation
- **Scenario:** 50 simulated requests simultaneously attempting to purchase the last 2 units of an oversized hoodie.
- **Result:** The first 2 requests succeeded and acquired atomic reservation locks. The remaining 48 requests received clean `400 Bad Request: Insufficient stock` responses. Zero data corruption or negative inventory occurred.

### 4.2 Security Vulnerability Scans
- **SQL Injection:** Automated fuzz testing with SQL injection payloads (`' OR 1=1 --`) across all search, filter, and login parameters. 100% blocked by Prisma parameterized queries.
- **Cross-Site Scripting (XSS):** Script injection (`<script>alert(1)</script>`) tested in customer reviews and address notes. React automatic JSX escaping and NestJS DTO sanitization neutralized all payloads.

---

## 5. Bug Tracking, Regression & Mitigation Ledger

| Bug Reference | Discovered In | Description | Root Cause | Resolution / Fix | Verified |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | Product Images | BigInt identity PK on `images` caused serialization crash in Express JSON responses | Standard `JSON.stringify` does not support native JavaScript `BigInt` | Added `(BigInt.prototype as any).toJSON = function() { return this.toString(); };` polyfill in `main.ts` | **FIXED** |
| **BUG-002** | URL Normalization | Next.js double slashes (`//product-catalogue`) failed router matching | Client-side dynamic route concatenation bug | Added Express URL normalization middleware in NestJS `main.ts` stripping leading duplicate slashes | **FIXED** |
| **BUG-003** | Primary Address | Multiple addresses set as `is_primary = true` simultaneously | Lack of conditional uniqueness constraint | Created partial unique index `user_addresses_one_primary_per_customer` in PostgreSQL | **FIXED** |
| **BUG-004** | Guest Cart | Guest cart lost on page navigation | Pure React state without session storage | Backed guest cart by browser `sessionStorage` until registration | **FIXED** |
