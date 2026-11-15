# Vergo Wear - Backend API Application

The backend application for the **Vergo Wear** custom apparel and e-commerce order management platform. Built on **NestJS 11**, **TypeScript**, **Prisma ORM 6**, **Supabase PostgreSQL**, **Cloudinary Media Cloud**, **Resend Transactional Email**, and **Citypak Falcon Courier API**.

---

## Architecture & Technology Stack

- **Framework:** [NestJS 11](https://nestjs.com/) (Node.js LTS v20+ / v22+)
- **Language:** TypeScript 5.7+
- **ORM & Data Layer:** [Prisma ORM 6.2.0](https://www.prisma.io/) with PostgreSQL 15+ hosted on [Supabase](https://supabase.com/)
- **Security & RBAC:** Supabase JWT Verification, Custom `@Roles()` decorator, NestJS Guards, Helmet HTTP headers, CORS origin whitelisting, class-validator / class-transformer ValidationPipes
- **Transactional Email:** [Resend SDK](https://resend.com/) with published dynamic HTML templates and graceful Nodemailer SMTP fallback
- **Media CDN & Storage:** [Cloudinary Media SDK v2](https://cloudinary.com/) (in-memory buffer uploads, private bank slip storage, product and proof image management)
- **Logistics Integration:** [Citypak Falcon Client API v0.2.5](https://staging.citypak.lk) (consignments, Code 128 thermal 4x6 / A4 PDF waybills, tracking, HMAC-SHA256 webhooks, courier pickup dispatch)

---

## Directory Structure

```text
backend/
├── prisma/
│   ├── schema.prisma              # 40-table PostgreSQL Prisma schema definition
│   └── migrations/                # Version-controlled SQL migrations
├── src/
│   ├── addresses/                 # Customer delivery address book
│   ├── admin/                     # Store administration, KPIs, employee management & stock distribution
│   ├── auth/                      # Supabase authentication, JWT validation & RBAC guards
│   ├── cart/                      # Customer and guest shopping cart persistence
│   ├── cloudinary/                # Reusable Cloudinary upload, buffer streaming & asset cleanup
│   ├── customization/             # Custom apparel configurator & print placement
│   ├── delivery-fees/             # Sri Lankan district-based dynamic delivery fee rules
│   ├── email/                     # Resend API template engine + SMTP fallback service
│   ├── employees/                 # Workshop employee fulfillment queue & commission ledger
│   ├── integrations/
│   │   └── citypak/               # Citypak Courier API client, waybills, pickups & webhooks
│   ├── notifications/             # In-app notifications & customer/admin email dispatchers
│   ├── orders/                    # Two-phase checkout, order lifecycle & parcel staging
│   ├── payment-proof/             # Bank transfer slip uploads, verification modal & expiration cron
│   ├── product-catalogue/         # Products, categories, variants, inventory, sizes & colors
│   ├── reviews/                   # Customer reviews, ratings, and media moderation
│   ├── stock-reservation/         # Atomic concurrency-safe stock reservation locks & release cron
│   ├── app.module.ts              # Root NestJS application module
│   └── main.ts                    # Bootstrap: Helmet, CORS, ValidationPipe, Global Prefix
├── test/                          # End-to-End (E2E) integration test suites
├── .env.example                   # Environment configuration template
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # TypeScript compiler configuration
```

---

## Key Backend Modules & Capabilities

1. **Two-Phase Checkout & Concurrency-Safe Stock Reservation (`orders`, `stock-reservation`):**
   - Atomic check-and-decrement stock reservation locks in `stock_reservation` preventing overselling during flash sales.
   - Dual checkout channels: Cash on Delivery (COD) and Bank Deposit Transfer.
   - 24-hour expiration cron job automatically releases unverified reserved stock back into available inventory.

2. **Transactional Email Engine with Resend (`email`, `notifications`):**
   - Official integration with the Resend API SDK using published dynamic templates:
     - `RESEND_TEMPLATE_NEW_ORDER` (`new-order-notification`): Alerts admins upon incoming orders.
     - `RESEND_TEMPLATE_ORDER_RECEIVED` (`order-received-waiting-for-admin-approval`): Customer confirmation with PDF invoice attachments.
     - `RESEND_TEMPLATE_ORDER_APPROVED` (`order-approved`): Sent upon admin payment/order confirmation.
     - `RESEND_TEMPLATE_ORDER_REJECTED` (`order-rejection`): Customer notification with structured audit reason notes.
     - `RESEND_TEMPLATE_DELIVERY` (`delivery-notification`): Customer alert when parcels are dispatched or handed to Citypak.
     - `RESEND_TEMPLATE_EMPLOYEE` (`employee-account-creation`): Welcome credentials and temporary password dispatch.
     - `RESEND_TEMPLATE_STOCK_REQUEST` (`stock-request`): Workshop employee low-stock / restock request sent to admin.
     - `RESEND_TEMPLATE_STOCK_DISTRIBUTION` (`stock-distribution`): Admin-to-employee branch stock allocation notification.
   - Strict string sanitization for all template variables to prevent Resend API validation errors.
   - Non-blocking error handling: failed email dispatches never abort or roll back successful database transactions.

3. **Workshop Fulfillment & Commission Management (`employees`, `orders`):**
   - Real-time order claiming queue with conditional SQL atomic locking to prevent multiple employees from grabbing the same parcel.
   - Multi-step parcel progression: `Admin Approved` ➔ `Claimed` ➔ `Preparing` ➔ `Ready for Courier Pickup` ➔ `Handed to Courier` ➔ `Completed`.
   - Automatic commission accrual per fulfilled parcel with payroll balance ledger.

4. **Citypak Falcon Courier Integration (`integrations/citypak`):**
   - Consignment registration with automatic COD collection amounts and weight/dimension checks.
   - Direct streaming of thermal Code 128 barcode waybills (`4X6` adhesive labels & `A4` manifests).
   - HMAC-SHA256 signature-verified webhook endpoints for milestone updates (`FIRST MILE RECEIVE SCAN`, `OUT FOR DELIVERY`, `DL`, `RTM`).

5. **Cloudinary Asset Management (`cloudinary`, `payment-proof`):**
   - Buffer upload streams for product imagery, embroidery/print files, and bank deposit slips.
   - Post-commit asset destruction hooks to clean up rejected receipts and prevent orphaned cloud storage.

---

## Environment Variables Setup

Create a `.env` file in the `backend/` directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure the following environment variables:

```ini
PORT=3001
FRONTEND_URL=http://localhost:3000

# Supabase PostgreSQL Database (Session Pooler port 5432)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres"
DATABASE_POOL_MAX=5
DATABASE_CONNECTION_TIMEOUT_MS=15000
DATABASE_TRANSACTION_MAX_WAIT_MS=10000
DATABASE_TRANSACTION_TIMEOUT_MS=20000

# Supabase Auth
SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Cloudinary Media Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Resend Transactional Email API
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Vergo Wear <orders@vergowear.com>"
RESEND_ADMIN_FROM_EMAIL="Vergo Admin <admin@vergowear.com>"
VERGO_ADMIN_EMAIL=admin@vergowear.com
RESEND_TEMPLATE_NEW_ORDER=new-order-notification
RESEND_TEMPLATE_ORDER_RECEIVED=order-received-waiting-for-admin-approval
RESEND_TEMPLATE_ORDER_APPROVED=order-approved
RESEND_TEMPLATE_ORDER_REJECTED=order-rejection
RESEND_TEMPLATE_DELIVERY=delivery-notification
RESEND_TEMPLATE_EMPLOYEE=employee-account-creation
RESEND_TEMPLATE_STOCK_REQUEST=stock-request
RESEND_TEMPLATE_STOCK_DISTRIBUTION=stock-distribution

# Legacy SMTP Fallback (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Vergo Wear <no-reply@vergowear.com>"

# Citypak Falcon Courier API
CITYPAK_BASE_URL=https://staging.citypak.lk
CITYPAK_API_TOKEN=your_citypak_api_token
CITYPAK_WEBHOOK_SECRET=your_citypak_webhook_secret
```

---

## Installation & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Run Application
```bash
# Development (with hot-reload)
npm run start:dev

# Production build & run
npm run build
npm run start:prod
```
The NestJS API service runs at `http://localhost:3001` (or your configured `PORT`).

---

## Testing & Quality Assurance

```bash
# Run unit tests across 14 spec suites
npm run test

# Run tests with code coverage report
npm run test:cov

# Run End-to-End (E2E) integration tests
npm run test:e2e
```

---

## License

Copyright © 2026 CodeRangers for VERGO Wear. Developed for Academic Course CSC304S3 / CSC304G3, University of Jaffna.
