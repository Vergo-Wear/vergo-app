# Vergo Wear - Security Architecture & Data Protection Document
**Course:** Team Software Project (CSC304S3 / CSC304G3)  
**System:** Vergo Wear Custom Apparel & E-Commerce Platform  
**Document Version:** 1.0.0  
**Document Classification:** Academic Technical Report  

---

## Table of Contents
1. [Security Overview & Threat Modeling](#1-security-overview--threat-modeling)
2. [Authentication & Session Lifecycle](#2-authentication--session-lifecycle)
3. [Role-Based Access Control (RBAC) & Route Guards](#3-role-based-access-control-rbac--route-guards)
4. [Database Security & Row Level Security (RLS)](#4-database-security--row-level-security-rls)
5. [Network, HTTP Headers & CORS Defense](#5-network-http-headers--cors-defense)
6. [Input Validation, Sanitization & SQL Injection Defense](#6-input-validation-sanitization--sql-injection-defense)
7. [Concurrency Control & Atomic Stock Locking](#7-concurrency-control--atomic-stock-locking)
8. [Media Storage & Cloudinary Upload Security](#8-media-storage--cloudinary-upload-security)
9. [Secrets Management & Environment Hardening](#9-secrets-management--environment-hardening)

---

## 1. Security Overview & Threat Modeling

The Vergo Wear system processes personal customer contact information, delivery addresses, financial payment slips, and multi-branch commercial inventory. A STRIDE threat modeling assessment was conducted during the design phase to identify and mitigate key attack vectors:

| STRIDE Category | Threat Description | Architectural Mitigation in Vergo Wear |
| :--- | :--- | :--- |
| **Spoofing** | Impersonation of customers or employees to manipulate orders. | Cryptographic JWT verification via Supabase Auth; password hashing with Bcrypt/Argon2. |
| **Tampering** | Modifying product prices, order totals, or delivery charges during checkout. | Server-side price calculation; client-provided subtotals are completely ignored. Immutable snapshot tables (`order_customer_details`, `order_shipping_details`). |
| **Repudiation** | Denial of bank slip submission or employee order claiming. | Audit logs with timestamps, employee ID foreign key assignments, and immutable payment proof records. |
| **Information Disclosure** | Unauthorized viewing of other users' orders or saved addresses. | PostgreSQL Row Level Security (RLS) policies; NestJS route ownership guards. |
| **Denial of Service** | Flooding backend APIs or locking inventory by creating fake unpaid orders. | Request payload limits (2MB), rate limiting, and 24-hour automatic reservation expiration cron jobs. |
| **Elevation of Privilege** | Normal shoppers attempting to access `/admin` or `/employee` routes. | Declarative NestJS `@Roles('admin')` decorators and `RolesGuard` validating database-backed profile roles. |

---

## 2. Authentication & Session Lifecycle

### 2.1 Identity Provider (Supabase Auth)
Authentication is anchored on Supabase Auth (an open-source GoTrue implementation):
- **User Secrets:** Passwords never touch the application database in plaintext; they are hashed using salted cryptographic algorithms handled exclusively by Supabase's secure Auth service.
- **Tokens Issued:**
  - `access_token`: Short-lived JSON Web Token (JWT) signed with RS256/HS256 containing `sub` (User UUID), `aud`, and `exp`.
  - `refresh_token`: Secure, rotatable token used to renew expired access tokens without re-prompting credentials.
- **Social Sign-In:** Google OAuth 2.0 PKCE flow prevents authorization code interception on mobile and web browsers.

### 2.2 Token Extraction & Validation Workflow
```
[Client Request: Bearer <JWT>] 
         │
         ▼
[NestJS AuthGuard / JwtStrategy]
         │
         ├──> Verify Signature against SUPABASE_JWT_SECRET
         ├──> Check Token Expiration Timestamp
         └──> Query `profiles` table to resolve active User Role (Customer/Employee/Admin)
```

---

## 3. Role-Based Access Control (RBAC) & Route Guards

The application enforces a 3-tier Role-Based Access Control hierarchy:

```
[System Roles]
  ├── Admin      (Full System Control, Analytics, Approvals, Product Creation)
  ├── Employee   (Fulfillment Board, Milestone Checkoffs, Branch Inventory Inspection)
  └── Customer   (Storefront Browsing, Cart, Own Orders & Address Book)
```

### 3.1 Implementation in NestJS
Guards operate at the controller and method level using NestJS Reflection:

```typescript
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@Get('/admin/analytics/overview')
async getAnalytics() { ... }
```

If a user with a `customer` role attempts to invoke an endpoint decorated with `@Roles('admin')` or `@Roles('employee')`, the guard throws a `403 ForbiddenException` before the controller logic executes.

---

## 4. Database Security & Row Level Security (RLS)

PostgreSQL Row Level Security (RLS) is enabled on all critical Supabase tables. Even if an attacker executes raw SQL via an exposed client key, the database engine itself enforces row isolation:

### 4.1 Sample RLS Policy: Customer Orders Isolation
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Customers can ONLY select their own orders
CREATE POLICY "Customers view own orders" ON orders
FOR SELECT
USING (auth.uid() = customer_id);

-- Employees and Admins can view orders across branches
CREATE POLICY "Staff view assigned or all orders" ON orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role_id IN (SELECT role_id FROM role WHERE role_name IN ('admin', 'employee'))
  )
);
```

### 4.2 Immutable Snapshot Isolation
To protect against post-checkout manipulation (e.g. customer changing their address after an order is processed):
- `order_customer_details` and `order_shipping_details` are inserted once inside the order transaction with deliberate lack of cascade updates.
- Historical orders preserve the exact state of delivery and pricing at the time of purchase.

---

## 5. Network, HTTP Headers & CORS Defense

### 5.1 Helmet Protection
In `main.ts`, the application initializes `helmet()` middleware with specialized policy headers:
- `Content-Security-Policy (CSP)`: Disallows unauthorized inline scripts.
- `X-Frame-Options: DENY`: Prevents Clickjacking attacks by forbidding iframe rendering.
- `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin`: Obscures sensitive URL parameters in referrers.

### 5.2 Dynamic CORS Whitelisting
To prevent cross-site request forgery from unauthorized third-party domains:
```typescript
const allowedOrigins = process.env.FRONTEND_URL.split(',');
app.enableCors({
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});
```

---

## 6. Input Validation, Sanitization & SQL Injection Defense

### 6.1 Prisma Parameterized Queries
All database communication in NestJS is handled through Prisma ORM, which exclusively executes parameterized prepared statements. Raw SQL string concatenation is strictly banned, eliminating SQL Injection (SQLi) vulnerabilities.

### 6.2 NestJS Global Validation Pipe
Incoming HTTP bodies are strictly validated against TypeScript Data Transfer Objects (DTOs) annotated with `class-validator` rules:
```typescript
export class CreateOrderDto {
  @IsNotEmpty()
  @IsUUID()
  branch_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsEnum(['COD', 'Bank Transfer'])
  payment_method: string;
}
```
The `whitelist: true` option automatically strips unexpected properties, preventing Mass Assignment vulnerabilities.

---

## 7. Concurrency Control & Atomic Stock Locking

In high-demand apparel drops, multiple customers might simultaneously attempt to purchase the last available hoodie in Size XL.

### 7.1 Two-Phase Atomic Reservation Pattern
To prevent overselling and database race conditions:
1. Stock reservations occur inside a database transaction (`prisma.$transaction`) across `inventory` and `stock_reservation`:
   ```sql
   -- Step 1: Atomic check-and-decrement in inventory
   UPDATE public.inventory 
   SET quantity = quantity - $requested_qty
   WHERE inventory_id = $inventoryId 
     AND quantity >= $requested_qty;

   -- Step 2: Create lock entry in stock_reservation
   INSERT INTO public.stock_reservation (
     inventory_id, checkout_id, quantity, status, expires_at
   ) VALUES (
     $inventoryId, $checkoutId, $requested_qty, 'Active', NOW() + INTERVAL '24 hours'
   );
   ```
2. If zero rows are affected in `inventory`, the transaction rolls back immediately and throws an HTTP 400 `Insufficient Stock` exception.
3. When the order is confirmed upon payment verification, an immutable record is inserted into `public.inventory_commitment` and the temporary lock in `public.stock_reservation` is closed.
4. If the payment proof is rejected or the 24-hour window lapses, a background cron task executes an automatic rollback, returning the reserved stock to available inventory:
   ```sql
   UPDATE public.inventory 
   SET quantity = quantity + $reservationQty 
   WHERE inventory_id = $inventoryId;
   ```

---

## 8. Media Storage & Cloudinary Upload Security

Customer payment slips, color swatches, product variant images, and customer review photos are processed and served through Cloudinary Media CDN:
- **In-Memory Buffer Streaming:** File uploads never touch the server disk. Files are streamed directly from Multer memory buffers to Cloudinary via `cloudinary.uploader.upload_stream({ resource_type: 'auto' })`, eliminating local temporary file tampering and container disk exhaustion.
- **Strict Content-Type Whitelisting:** Allowed MIME types are restricted to `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`. Dangerous file formats (SVG scripts, executables, shell scripts) are blocked at the NestJS file interceptor level.
- **Asset Invalidation & Deletion:** When a customer updates an illegible receipt slip or an admin deletes an obsolete product photo, `CloudinaryService.deleteAsset(publicId)` immediately invalidates the asset across global CDN Edge locations.
- **Storage Public ID Tracking:** Both the secure HTTPS delivery URL (`file_url`) and the Cloudinary identifier (`storage_public_id`) are stored in `public.payment_proof` to guarantee exact asset auditability.

---

## 9. Secrets Management & Environment Hardening

1. **Separation of Keys:**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Safe for frontend exposure, restricted by RLS.
   - `SUPABASE_SERVICE_ROLE_KEY`: Held **strictly** in backend `.env`; bypasses RLS and is never leaked to the client browser.
2. **Git Integrity:** All `.env` and `.env.local` files are rigorously excluded in `.gitignore`. Production secrets are injected dynamically via environment variables during CI/CD container deployment.
