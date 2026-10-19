# Vergo Wear - Project Documentation Suite
**Course:** Team Software Project (CSC304S3 / CSC304G3)  
**Department:** Department of Computer Science, Faculty of Science, University of Jaffna  
**Project:** Vergo Wear - Custom Apparel & E-Commerce Order Management Platform  
**Date:** October 2026  

---

## Documentation Structure & Navigation Index

This directory contains the complete project documentation package:

```
Final Docs/
├── 01_DEVELOPER_DOCUMENTATION.md          # Comprehensive Developer Documentation
├── 02_USER_DOCUMENTATION.md               # User Manual & Operating Guide
├── 03_API_SPECIFICATION.md                # Comprehensive REST API Reference & Endpoints
├── 04_SECURITY_ARCHITECTURE.md            # Security, Authentication, RBAC, RLS & Hardening
├── 05_TEST_CASES_AND_QUALITY_ASSURANCE.md # QA Strategy, Unit Test Suites, Manual Test Matrix
├── 06_DATABASE_AND_STORAGE_ARCHITECTURE.md# Live 31-Table Schema, Two-Phase Checkout & Cloudinary CDN
├── 07_COURIER_LOGISTICS_AND_CONCURRENCY_HANDLING.md # Citypak API, Waybills, Tracking & 7 Concurrency Locks
└── README.md                              # Master Index (This File)
```

---

## Project Documentation Overview

### 1. Developer Documentation (`01_DEVELOPER_DOCUMENTATION.md`)

| Section | Topic | Status |
| :--- | :--- | :---: |
| **1. Copyright's Statement** | Chapter 1: Formal copyright and license for University of Jaffna | Complete |
| **2. Executive Summary** | Chapter 2: High-level architectural overview, problems resolved, tech stack | Complete |
| **3. Objective of the Project** | Chapter 3: 6 quantifiable business and technical objectives | Complete |
| **4. Customer** | Chapter 4: Shoppers, workshop employees, store administrators, and logistics couriers | Complete |
| **5. Problem Statement** | Chapter 5: Operational friction in retail apparel, inventory mismatches, slip fraud | Complete |
| **6. Proposed Solution** | Chapter 6: Detailed engineering solution with: | Complete |
| &nbsp;&nbsp;&nbsp;&nbsp;• Team details | Name, student registration numbers, and assigned project roles | Complete |
| &nbsp;&nbsp;&nbsp;&nbsp;• Software details | Application name, version (1.0.0), license (MIT/Academic), frameworks | Complete |
| &nbsp;&nbsp;&nbsp;&nbsp;• System overview | Core functionalities, how to test, and known bug mitigations | Complete |
| &nbsp;&nbsp;&nbsp;&nbsp;• Diagrams | **Use Case Diagram** for whole system, **Class Diagram** for domain entities, **Sequence Diagrams** for checkout and slip verification | Complete |
| &nbsp;&nbsp;&nbsp;&nbsp;• Main components | Frontend component hierarchy, backend service architecture, GUI breakdowns | Complete |
| &nbsp;&nbsp;&nbsp;&nbsp;• More information | GitHub repo link, database references, companion technical addendums | Complete |

---

### 2. User Documentation (`02_USER_DOCUMENTATION.md`)

| Section | Topic | Status |
| :--- | :--- | :---: |
| **1. Executive Summary** | Chapter 1: Purpose of the system from an operational perspective | Complete |
| **2. Objective of the Project** | Chapter 2: Streamlining custom apparel ordering, fulfillment, and delivery tracking | Complete |
| **3. Customer** | Chapter 3: End-user personas (Shoppers, Workshop Craftsmen, Management) | Complete |
| **4. Problem Statement** | Chapter 4: Payment reconciliation friction, lost packages, staff miscoordination | Complete |
| **5. Proposed Solution** | Chapter 5: Complete operational guide with: | Complete |
| &nbsp;&nbsp;&nbsp;&nbsp;• Team details | Team roster, student registration numbers, roles | Complete |
| &nbsp;&nbsp;&nbsp;&nbsp;• Software details | Version, browser compatibility, system requirements | Complete |
| &nbsp;&nbsp;&nbsp;&nbsp;• How to install | Step-by-step installation: Prerequisites, .env configs, Prisma setup, dev servers | Complete |
| &nbsp;&nbsp;&nbsp;&nbsp;• Graphical User Interface flow | Complete walkthrough with visual maps for Customer, Employee, and Admin portals | Complete |
| &nbsp;&nbsp;&nbsp;&nbsp;• Vocabulary | Comprehensive glossary (SKU, Base Price, Reserved Quantity, COD, AWB, Webhook, RLS) | Complete |

---

### 3. Technical Addendums (APIs, Security, Testing, Database, Logistics & Concurrency)

In addition to the primary academic report requirements, the following deep-dive engineering manuals have been provided:

1. **[03_API_SPECIFICATION.md](file:///e:/All%20Projects/GitHub_Projects/Vergo-Wear/vergo-app/vergo-app/Final%20Docs/03_API_SPECIFICATION.md):**
   - Detailed endpoint definitions, HTTP verbs, URL routes, request payloads, query parameters, responses, and standard status codes.
   - Covers Authentication, Product Catalogue, Shopping Cart, Orders, Payment Slips, Delivery Rules, Employee Queue, and Admin Management.

2. **[04_SECURITY_ARCHITECTURE.md](file:///e:/All%20Projects/GitHub_Projects/Vergo-Wear/vergo-app/vergo-app/Final%20Docs/04_SECURITY_ARCHITECTURE.md):**
   - STRIDE threat modeling analysis.
   - Supabase JWT authentication and session handling.
   - Role-Based Access Control (RBAC) with NestJS guards (`@Roles('admin')`).
   - PostgreSQL Row Level Security (RLS) data isolation policies.
   - Helmet HTTP security headers, CORS origin whitelisting, and DTO validation.
   - Concurrency protection: Atomic check-and-lock stock reservation to prevent race conditions.
   - Cloudinary secure media upload and private file access.

3. **[05_TEST_CASES_AND_QUALITY_ASSURANCE.md](file:///e:/All%20Projects/GitHub_Projects/Vergo-Wear/vergo-app/vergo-app/Final%20Docs/05_TEST_CASES_AND_QUALITY_ASSURANCE.md):**
   - Comprehensive test strategy following the test pyramid.
   - Breakdown of the 14 automated Jest test suites in the backend.
   - 20+ manual and end-to-end test cases with Preconditions, Steps, Expected Results, and Status.
   - Concurrency stress testing scenarios and documented bug fix history.

4. **[06_DATABASE_AND_STORAGE_ARCHITECTURE.md](file:///e:/All%20Projects/GitHub_Projects/Vergo-Wear/vergo-app/vergo-app/Final%20Docs/06_DATABASE_AND_STORAGE_ARCHITECTURE.md):**
   - Full Data Dictionary for all 31 live database tables based on PostgreSQL DDL.
   - Complete Mermaid Entity-Relationship (ER) diagram with all foreign keys and cardinalities.
   - Two-Phase Checkout & Stock Reservation Lifecycle (`pending_checkout` ➔ `stock_reservation` ➔ `payment_proof` ➔ `orders` ➔ `inventory_commitment`).
   - Logistics & Courier Tracking Schema (`delivery`, `delivery_waybill`, `delivery_tracking_event`, `courier_pickup_request`, `courier_shipper_profile`).
   - Cloudinary Media Storage architecture (`CloudinaryService`, upload streams, folder namespaces, public ID extraction, asset invalidation, CDN responsive delivery).

5. **[07_COURIER_LOGISTICS_AND_CONCURRENCY_HANDLING.md](file:///e:/All%20Projects/GitHub_Projects/Vergo-Wear/vergo-app/vergo-app/Final%20Docs/07_COURIER_LOGISTICS_AND_CONCURRENCY_HANDLING.md):**
   - **Citypak Falcon API Integration**: Consignment creation, non-ASCII regex sanitation (`/[^\x00-\x7F]+/`), thermal 4x6 & A4 barcode waybill streaming, real-time tracking, HMAC-SHA256 signature verified webhooks, and bulk courier rider pickups.
   - **7 Core Concurrency Patterns**: Flash-drop check-and-decrement stock locks, multi-employee competitive order claiming with conditional SQL assignment, post-commit Cloudinary asset destruction, primary address partial unique index locks, idempotent webhook upserts, and cron worker race condition isolation.

---

## Quick Reference Commands

```bash
# Backend Setup
cd backend
npm install
npx prisma generate
npm run start:dev     # Starts backend on http://localhost:3001
npm run test          # Runs automated Jest unit tests

# Frontend Setup
cd frontend
npm install
npm run dev           # Starts Next.js storefront on http://localhost:3000
npm run typecheck     # Runs TypeScript verification
```
