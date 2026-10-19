# Vergo Wear - User Documentation & Operating Manual
**Course:** Team Software Project (CSC304S3 / CSC304G3)  
**Project:** Vergo Wear - Custom Apparel & E-Commerce Order Management System  
**Document Type:** User Documentation & Operating Manual  
**Date:** October 2026  
**Document Version:** 1.0.0  

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Objective of the Project](#2-objective-of-the-project)
3. [Customer](#3-customer)
4. [Problem Statement](#4-problem-statement)
5. [Proposed Solution](#5-proposed-solution)
   - 5.1 [Team Details](#51-team-details)
   - 5.2 [Software Details](#52-software-details)
   - 5.3 [How to Install and Setup](#53-how-to-install-and-setup)
     - System Prerequisites
     - Environment Variable Configuration
     - Database Setup (Supabase & Prisma)
     - Running Backend & Frontend
     - Initial Seed Data & Default Administrative Logins
   - 5.4 [Explain the Flow Using Graphical User Interface (GUI)](#54-explain-the-flow-using-graphical-user-interface-gui)
     - Customer Shopping & Tracking Journey
     - Employee Fulfillment Board & Preparation Workflow
     - Administrator Operations, Approval & Analytics Portal
   - 5.5 [Vocabulary & Glossary](#55-vocabulary--glossary)

---

## 1. Executive Summary

The **Vergo Wear Platform** is an e-commerce, custom apparel ordering, and order management software suite created specifically to bridge the communication gap between apparel shoppers, workshop craftsmen, and retail administrators. 

For the customer, the platform transforms clothing shopping into an interactive experience with customizable garment attributes, simple 3-stage checkout, transparent delivery rates, and real-time order milestone tracking. For employees and management, it replaces chaotic messaging apps and paper receipts with an automated web portal featuring real-time order claiming, instant payment verification, automated slip expiration, and streamlined courier dispatch.

---

## 2. Objective of the Project

The core objectives from the end-user's standpoint are:
1. **Provide a Hassle-Free Shopping Experience:** Enable shoppers on mobile, tablet, and desktop devices to discover modern apparel, inspect sizing, configure custom prints/embroidery, and order within minutes.
2. **Eliminate Ordering Uncertainty:** Provide clear visibility into whether an item is in stock at their local branch and provide real-time updates as the order moves from sewing to delivery.
3. **Facilitate Flexible Local Payments:** Allow buyers who do not own credit cards to pay either with Cash on Delivery (COD) or by uploading direct bank transfer deposit slips safely.
4. **Boost Employee Productivity:** Allow workshop staff to quickly see which orders need packaging and claim them to prevent duplicate work.
5. **Give Business Owners Actionable Insight:** Present owners with automated financial data, sales velocity, branch inventory status, and customer reviews in one centralized dashboard.

---

## 3. Customer

The system serves three primary user personas:

1. **Shoppers & Registered Customers:**
   - Fashion-conscious individuals shopping for premium everyday apparel and custom merchandise.
   - Requires easy account registration, address book management, order history, and live tracking.
2. **Floor & Workshop Employees:**
   - Tailors, printing operators, and dispatch staff who fulfill orders inside branch stores.
   - Requires clear, high-contrast, touch-friendly order claiming lists and status checkoff buttons.
3. **Store Administrators & Managers:**
   - Store managers and company accountants overseeing inventory, branch performance, and payment verification.
   - Requires quick review of payment proof slips, supplier replenishment, product creation, and revenue analytics.

---

## 4. Problem Statement

Prior to adopting the Vergo Wear solution, buyers and apparel store teams endured frequent disruptions:
- **Unclear Payment Processes:** Customers paying by bank transfer had to photograph paper slips, upload them to social media chat channels, and wait days for manual confirmation.
- **Lost or Delayed Packages:** Customers had no easy way to track their parcel's actual stage or know when their courier package would arrive.
- **Stock Mismatches:** Customers ordered items that had already been bought by walk-in customers at physical branches.
- **Disorganized Staff Coordination:** Staff had no shared digital schedule of which orders were ready to cut, print, iron, or ship, causing delayed orders and customer dissatisfaction.

---

## 5. Proposed Solution

The Vergo Wear web platform resolves all of these challenges by providing a synchronized, multi-portal web application accessible from any modern browser.

### 5.1 Team Details

**Course Unit:** Team Software Project (CSC304S3 / CSC304G3)  
**Institution:** Department of Computer Science, Faculty of Science, University of Jaffna  

| Member Name | Student Registration No | Role | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **Pamuda Uposath De Alwis Goonatilake** | *Team Lead & Full-Stack Architect* | System Architecture, Database Design, Customization Engine |
| **S. Himath Hansana Senasinghe** | `2022/CSC/068` | Frontend Lead & UX Engineer | Next.js Interface, Storefront, Mobile Layouts & Flow Design |
| **Bhagya Sandakelum** | `2022/CSC/030` | Backend & Integrations Engineer | Payment Verification, Courier Integration & Delivery Fees |
| **Pasidu Chamod** | `2022/CSC/xxx` | Full-Stack & QA Engineer | Employee Portal, Stock Reservation & Automated Testing |
| **Vihanga Nethsara** | `2022/CSC/xxx` | Database & Security Engineer | Supabase RLS, Profile Engine & Review Moderation |

---

### 5.2 Software Details

- **Software Name:** Vergo Wear E-Commerce & Order Management Platform
- **Version:** `1.0.0`
- **License:** Open Academic / MIT License
- **User Interface Framework:** Next.js 16 (React 19) with Tailwind CSS
- **Backend Service Framework:** NestJS 11 with Node.js
- **Database Engine:** Supabase PostgreSQL with Prisma ORM
- **Supported Browsers:** Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge (Desktop & Mobile)

---

### 5.3 How to Install and Setup

Follow these step-by-step instructions to set up and run the entire Vergo Wear system on a local machine or server.

#### 1. System Prerequisites
Ensure the following tools are installed on your machine:
- **Node.js:** Version `20.x` or `22.x` (LTS recommended)
- **Package Manager:** `npm` (v10+)
- **Git:** Latest version
- **Database Access:** A Supabase project account (or a local PostgreSQL instance)

#### 2. Cloning the Repository
Open your terminal (PowerShell or Bash) and clone the repository:
```bash
git clone https://github.com/Vergo-Wear/vergo-app.git
cd vergo-app
```

#### 3. Backend Setup & Configuration
1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```
2. Configure the backend environment variables by creating `.env`:
   ```env
   PORT=3001
   FRONTEND_URL=http://localhost:3000

   # Supabase Database & Auth Connection
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="[YOUR-SUPABASE-SERVICE-ROLE-KEY]"
   SUPABASE_ANON_KEY="[YOUR-SUPABASE-ANON-KEY]"

   # Cloudinary Media Storage (For product images & payment slips)
   CLOUDINARY_CLOUD_NAME="[YOUR_CLOUD_NAME]"
   CLOUDINARY_API_KEY="[YOUR_API_KEY]"
   CLOUDINARY_API_SECRET="[YOUR_API_SECRET]"

   # Email Notifications (SMTP / Gmail)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="vergowear@gmail.com"
   SMTP_PASS="[YOUR_APP_PASSWORD]"

   # Logistics Integration (Citypak / Courier)
   CITYPAK_API_URL="https://api.citypak.lk/v1"
   CITYPAK_API_KEY="[YOUR_API_KEY]"
   ```
3. Synchronize Prisma with the database schema:
   ```bash
   npx prisma generate
   ```
4. Start the backend development server:
   ```bash
   npm run start:dev
   ```
   The backend will start and listen on `http://localhost:3001`.

#### 4. Frontend Setup & Configuration
1. Open a new terminal tab and navigate to the frontend folder:
   ```bash
   cd ../frontend
   npm install
   ```
2. Configure frontend environment variables in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-SUPABASE-ANON-KEY]
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The storefront client will be accessible at `http://localhost:3000`.

#### 5. Default Roles and Test Logins
The database contains seeded user roles to test different user journeys:
- **Storefront Customer:** Register via `/auth/register` or sign in with test account: `customer@vergo.lk` / `Password123!`
- **Workshop Employee:** `employee@vergo.lk` / `EmployeePass123!` (Access to `/employee`)
- **System Administrator:** `admin@vergo.lk` / `AdminPass123!` (Access to `/admin`)

---

### 5.4 Explain the Flow Using Graphical User Interface (GUI)

#### Flow 1: Customer Shopping, Customization, Checkout & Tracking

```
[Storefront Home] ──> [Product Catalog & Filters] ──> [Product Detail & Variant]
         │                                                      │
         ▼                                                      ▼
[Order Tracking View] <── [Checkout: Contact/Address/Pay] <── [Shopping Cart]
```

1. **Browsing the Collection (`/collection`):**
   - The user opens the home page or clicks **Collection** in the top navigation.
   - The left sidebar offers live filters for Category (Hoodies, T-Shirts, Caps), Size (S, M, L, XL, XXL), and Color palettes.
   - Products update dynamically without page reloads.
2. **Product Configuration & Selection (`/collection/[id]`):**
   - Clicking a garment displays high-resolution multi-angle photos from the Cloudinary CDN.
   - Selecting a size and color updates the SKU, shows branch availability, and dynamically updates the selling price.
   - Clicking **Add to Cart** updates the persistent header cart drawer.
3. **Cart Review (`/cart`):**
   - The customer reviews items, adjusts quantities, and views the calculated subtotal.
4. **Three-Stage Checkout (`/checkout`):**
   - **Step 1 - Contact Details:** Authenticated users have their profile details pre-filled. Guests can enter their name, email, and phone.
   - **Step 2 - Shipping Address:** The customer selects their Sri Lankan administrative district (e.g., Colombo, Kandy, Jaffna). The system calculates the exact delivery fee based on district rules.
   - **Step 3 - Payment Selection:**
     - **Cash on Delivery (COD):** The order is confirmed immediately with a COD service fee.
     - **Bank Transfer:** The screen displays Vergo Wear's official bank account details. The customer places the order and receives an order ID with a prompt to upload the deposit receipt.
5. **Uploading Payment Proof (`/profile/orders/[id]`):**
   - Within 24 hours of ordering, the customer navigates to the order details page and clicks **Upload Receipt Slip**.
   - An upload modal allows selecting a picture or PDF of the bank slip. Once submitted, the order status changes to `Pending Verification`.
6. **Order Timeline & Tracking (`/profile/orders/[id]/track`):**
   - A visual stepper displays the progress:
     `Order Placed` ➔ `Payment Verified` ➔ `In Preparation` ➔ `Ready for Dispatch` ➔ `With Courier` ➔ `Delivered`.

---

#### Flow 2: Floor Employee Order Fulfillment Board (`/employee`)

```
[Employee Dashboard] ──> [Claim Unclaimed Orders] ──> [Preparation Checklist] ──> [Dispatch Ready]
```

1. **Active Shift View (`/employee`):**
   - The employee logs in and sees orders assigned to their branch and an overview of their daily completed fulfillments.
2. **Claiming an Order (`/employee/orders`):**
   - The employee enters the order queue showing orders in `Ready to Process`.
   - Clicking **Claim Order** assigns the order to the logged-in employee (`assigned_employee_id`), preventing other workers from processing the same order.
3. **Product Preparation (`/employee/product-prep`):**
   - The screen shows garment sizes, color SKUs, custom printing/embroidery notes, and branch shelf location.
   - Once picked, printed, and quality-inspected, the employee clicks **Mark Prepared**, moving the order to `Ready`.
4. **Delivery Handover (`/employee/delivery-prep`):**
   - When the Citypak / Koombiyo courier driver arrives, the employee selects the packages and clicks **Generate Consignment Manifest**.
   - The order status updates to `Sent for Delivery`.

---

#### Flow 3: Administrator Operations, Approvals & Financial Control (`/admin`)

```
[Admin Analytics Dashboard] 
         │
         ├──> [Payment Verification Modal] ──> Approve / Reject Bank Slips
         ├──> [Inventory & Stock Transfers] ──> Replenish / Low-stock Alerts
         ├──> [Product & Variant Creator] ──> New Styles & Price Adjustments
         └──> [Employee Commission & Payroll] ──> Monthly Performance Review
```

1. **Executive Dashboard (`/admin`):**
   - Real-time KPI summary: Today's Total Sales, Active Orders in Pipeline, Low Stock Alerts, and Pending Payment Proofs.
2. **Payment Proof Moderation (`/admin/orders`):**
   - Admins filter by `Pending Verification`.
   - Clicking an order opens a modal displaying the customer-uploaded bank slip image, bank reference number, and order total.
   - **Approve:** Clicking "Approve" moves the status to `Ready to Process`, confirms the stock deduction, and emails the customer an invoice.
   - **Reject:** Admins can reject invalid or unreadable slips with a reason note, which prompts the customer to re-upload.
3. **Inventory & Branch Management (`/admin/inventory`):**
   - Lists all variant SKUs across branches.
   - Displays real-time counts: `Available Stock`, `Reserved Stock` (held for pending bank transfers), and `Reorder Level`.
   - Highlights items needing supplier replenishment in amber/red badges.
4. **Product Creation Wizard (`/product-creation`):**
   - Allows creating new garments with Base Price, Category, Supplier, and generating variants with custom sizes, colors, and SKU codes.
5. **Customer Feedback Moderation (`/admin/feedbacks`):**
   - Allows approving verified buyer ratings and reviews before they appear publicly on product detail pages.

---

### 5.5 Vocabulary & Glossary

| Term | Technical Definition | Plain-Language User Meaning |
| :--- | :--- | :--- |
| **SKU (Stock Keeping Unit)** | A unique alphanumeric identifier assigned to a specific variant (e.g., `HD-BLK-L`). | The unique code identifying a specific garment style, color, and size combination. |
| **Product Variant** | A specific physical child representation of a parent product distinguished by size and color. | A single purchasable option (e.g., "Vergo Oversized Hoodie" in "Jet Black, Size XL"). |
| **Base Price** | The primary standard price of the generic product entity before any variant alterations. | The standard starting price of an apparel model. |
| **Price Adjustment** | An incremental cost (`+` or `-`) applied by a specific variant over the base price. | Extra charges for larger sizes (e.g., +Rs. 300 for XXL) or premium materials. |
| **Reserved Quantity** | Stock held in an atomic database lock for orders awaiting payment proof verification. | Items temporarily put on hold so nobody else can buy them while your bank payment is verified. |
| **Reorder Level** | The minimum inventory threshold that triggers an automatic replenishment warning. | The low-stock alert point (e.g., below 5 items) reminding staff to restock. |
| **Cash on Delivery (COD)** | Payment method where payment is collected in cash by courier riders upon doorstep delivery. | Pay cash when your parcel is delivered to your hands. |
| **Payment Proof Slip** | An image/PDF receipt of a direct bank deposit uploaded by the buyer. | Your bank transfer screenshot or ATM deposit slip uploaded to confirm payment. |
| **Proof Expiration Window** | A 24-hour countdown during which bank transfer payment slips must be provided. | The 24-hour time limit to upload your payment receipt before the order is automatically cancelled. |
| **Fulfillment Queue** | The chronological sequence of verified orders awaiting packing and preparation by branch staff. | The digital work list for workshop employees showing what clothes need to be packed. |
| **Row Level Security (RLS)**| PostgreSQL security policy ensuring database rows are only queried by authorized profiles. | Database security ensuring customers can never see or modify other customers' data. |
| **Airway Bill (AWB)** | Unique barcode tracking consignment number provided by logistics couriers (e.g. Citypak). | The tracking code printed on the courier package to monitor delivery. |
| **Webhook** | An automated HTTP POST callback from third-party systems to update order status. | Real-time automated message from the courier service updating our system when your package is delivered. |
