# Vergo Wear - Custom Apparel E-Commerce & Order Management Platform

A full-stack, enterprise-grade custom order management and e-commerce web platform engineered for modern apparel brands. Built with **Next.js 16 (React 19)**, **NestJS 11**, **Prisma ORM**, **Supabase PostgreSQL**, **Cloudinary Media CDN**, and **Citypak Courier Logistics API**.

---

## Tech Stack

- **Frontend:** Next.js 16.2.9 (App Router), React 19.2.4, TypeScript, Tailwind CSS 4, Leaflet, React Joyride.
- **Backend:** NestJS 11.0.1, TypeScript, Express, Helmet, Class-Validator Pipes, Nodemailer, Axios.
- **Database & Auth:** Supabase PostgreSQL 15+ with Prisma ORM 6.2.0, Row Level Security (RLS), and Supabase Auth.
- **Media Storage:** Cloudinary Media Cloud (SDK v2) for product photography, fabric swatches, and bank deposit slips.
- **Logistics Integration:** Citypak Couriers (Falcon Client Panel API v0.2.5) with thermal 4x6 waybill PDF streaming, tracking webhooks, and pickup dispatch.

---

## Key System Features

1. **Apparel Storefront & Customization:**
   - Multi-criteria real-time product filtering (category, size, color swatch, price range).
   - Dynamic variant pricing (`base_price + price_adjustment`).
   - Persistent customer shopping cart and session-based guest cart.
   - Verified customer ratings and reviews with real garment customer photos.

2. **Two-Phase Checkout & Concurrency-Safe Stock Reservation:**
   - District-based delivery fee calculation via `delivery_fee_rules`.
   - Atomic check-and-decrement stock reservation locks in `stock_reservation` preventing flash-drop overselling.
   - Dual payment channels: Cash on Delivery (COD) and Direct Bank Transfer.
   - Immutable checkout snapshots (`order_customer_details`, `order_shipping_details`).

3. **Bank Slip Verification & Automated Expiration:**
   - In-memory buffer upload of deposit receipts directly to Cloudinary.
   - 24-hour expiration countdown timer; automated cron releases reserved inventory back to available stock if unverified.
   - Admin audit modal for one-click approval or rejection with reason notes.

4. **Workshop Employee Fulfillment Queue:**
   - Real-time order claiming queue with zero-collision conditional update locks.
   - Preparation milestone checklist: `Ready to Process` ➔ `Claimed by Employee` ➔ `Preparing` ➔ `Ready`.
   - Employee attendance tracking and parcel fulfillment commission payouts.

5. **Citypak Logistics & Courier Integration:**
   - Automated consignment registration with parcel dimensions, weight, and COD cash collection.
   - On-demand streaming of thermal Code 128 barcode waybills (`4X6` adhesive labels & `A4` batch manifests).
   - Real-time parcel milestone updates via HMAC-SHA256 signature-verified webhooks.
   - Bulk courier truck pickup scheduling per branch.

6. **Executive Admin Dashboard:**
   - KPI metrics: daily/monthly revenue, profit margins, sales velocity, low-stock warnings.
   - Multi-branch inventory tracking with branch-level reorder thresholds.
   - Product and variant creation wizard with SKU generation.
   - Customer feedback and review moderation.

---

## Actual Repository Structure

```
vergo-app/
├── backend/                             # NestJS 11 Server Application
│   ├── prisma/                          # Prisma ORM schema & migrations
│   │   ├── schema.prisma                # Database schema definitions
│   │   └── DATABASE_SCHEMA.md           # Live PostgreSQL schema reference
│   ├── src/
│   │   ├── addresses/                   # Customer address book module
│   │   ├── admin/                       # Administration & analytics module
│   │   ├── auth/                        # Supabase auth, JWT & RBAC guards
│   │   ├── cart/                        # Shopping cart persistence
│   │   ├── cloudinary/                  # Reusable Cloudinary media service
│   │   ├── customization/               # Apparel customization engine
│   │   ├── delivery-fees/               # District delivery fee calculation
│   │   ├── employees/                   # Staff fulfillment queue & commissions
│   │   ├── integrations/citypak/        # Citypak Falcon Courier API & webhooks
│   │   ├── notifications/               # Email & in-app notification engine
│   │   ├── orders/                      # Orders & 2-phase checkout engine
│   │   ├── payment-proof/               # Bank slip upload & audit module
│   │   ├── product-catalogue/           # Catalog, variants, colors & sizes
│   │   ├── reviews/                     # Customer reviews & moderation
│   │   ├── stock-reservation/           # Concurrency-safe stock lock & cron
│   │   └── main.ts                      # App bootstrap, Helmet, CORS, Pipes
│   └── test/                            # E2E test suites
│
├── frontend/                            # Next.js 16 Client Application
│   └── src/
│       ├── app/
│       │   ├── (store)/                 # Customer storefront, cart, checkout, profile
│       │   ├── (employee)/              # Workshop employee fulfillment board
│       │   └── (admin)/                 # Administrative control center
│       ├── components/                  # Reusable UI component library
│       ├── context/                     # Client state providers
│       ├── hooks/                       # Custom data fetching hooks
│       └── styles/                      # Tailwind CSS & custom styling
│
├── Final Docs/                          # Complete Academic Documentation Suite
│   ├── 01_DEVELOPER_DOCUMENTATION.md    # Developer Document [Weight: 60%]
│   ├── 02_USER_DOCUMENTATION.md         # User Document [Weight: 40%]
│   ├── 03_API_SPECIFICATION.md          # REST API Reference & Endpoints
│   ├── 04_SECURITY_ARCHITECTURE.md      # Security, Auth, RLS & Threat Modeling
│   ├── 05_TEST_CASES_AND_QUALITY_ASSURANCE.md # QA Matrix & 14 Jest Test Suites
│   ├── 06_DATABASE_AND_STORAGE_ARCHITECTURE.md# 31-Table DB Data Dictionary & Cloudinary
│   ├── 07_COURIER_LOGISTICS_AND_CONCURRENCY_HANDLING.md # Citypak API & 7 Concurrency Locks
│   └── README.md                        # Final Docs Master Index
│
└── REVIEW_STATUS.md                     # Live UI-to-Backend Integration Ledger
```

---

## Getting Started

### 1. Prerequisites
- **Node.js:** `v20.x` or `v22.x` (LTS)
- **npm:** `v10+`
- **Git**

### 2. Backend Setup
```bash
cd backend
npm install

# Configure environment variables
cp .env.example .env

# Generate Prisma Client
npx prisma generate

# Run in development mode
npm run start:dev
```
The backend starts at `http://localhost:3001`.

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Run in development mode
npm run dev
```
The storefront client is accessible at `http://localhost:3000`.

---

## Testing & Quality Assurance

```bash
# Run backend unit test suites (14 spec suites)
cd backend
npm run test

# Run test coverage
npm run test:cov

# Run End-to-End integration tests
npm run test:e2e

# Run frontend TypeScript validation
cd ../frontend
npm run typecheck
```

---

## Documentation

Full academic project documentation conforming to the **CSC304S3 / CSC304G3** guidelines is located in the [Final Docs](file:///e:/All%20Projects/GitHub_Projects/Vergo-Wear/vergo-app/vergo-app/Final%20Docs) directory:
- [01_DEVELOPER_DOCUMENTATION.md](file:///e:/All%20Projects/GitHub_Projects/Vergo-Wear/vergo-app/vergo-app/Final%20Docs/01_DEVELOPER_DOCUMENTATION.md) — 60% Developer Document
- [02_USER_DOCUMENTATION.md](file:///e:/All%20Projects/GitHub_Projects/Vergo-Wear/vergo-app/vergo-app/Final%20Docs/02_USER_DOCUMENTATION.md) — 40% User Document
- [03_API_SPECIFICATION.md](file:///e:/All%20Projects/GitHub_Projects/Vergo-Wear/vergo-app/vergo-app/Final%20Docs/03_API_SPECIFICATION.md) — Complete REST API Spec
- [04_SECURITY_ARCHITECTURE.md](file:///e:/All%20Projects/GitHub_Projects/Vergo-Wear/vergo-app/vergo-app/Final%20Docs/04_SECURITY_ARCHITECTURE.md) — Security & RLS Guide
- [05_TEST_CASES_AND_QUALITY_ASSURANCE.md](file:///e:/All%20Projects/GitHub_Projects/Vergo-Wear/vergo-app/vergo-app/Final%20Docs/05_TEST_CASES_AND_QUALITY_ASSURANCE.md) — QA Matrix & Test Cases
- [06_DATABASE_AND_STORAGE_ARCHITECTURE.md](file:///e:/All%20Projects/GitHub_Projects/Vergo-Wear/vergo-app/vergo-app/Final%20Docs/06_DATABASE_AND_STORAGE_ARCHITECTURE.md) — 31-Table Schema & Cloudinary
- [07_COURIER_LOGISTICS_AND_CONCURRENCY_HANDLING.md](file:///e:/All%20Projects/GitHub_Projects/Vergo-Wear/vergo-app/vergo-app/Final%20Docs/07_COURIER_LOGISTICS_AND_CONCURRENCY_HANDLING.md) — Citypak & Concurrency

---

## License

This software is developed for academic evaluation under the course unit **CSC304 Team Software Project**, Department of Computer Science, Faculty of Science, University of Jaffna. Licensed under the MIT / Academic Open License.
