# Vergo Wear - REST API Specification Reference
**Course:** Team Software Project (CSC304S3 / CSC304G3)  
**System:** Vergo Wear Custom Apparel & E-Commerce Platform  
**Document Version:** 1.0.0  
**Base URL (Local Development):** `http://localhost:3001`  
**Base URL (Production):** `https://api.vergo.lk`  
**Authentication Scheme:** Bearer Token (JWT issued via Supabase Auth)  

---

## Table of Contents
1. [API Architecture & Standards](#1-api-architecture--standards)
2. [Authentication & Profile Endpoints](#2-authentication--profile-endpoints)
3. [Product Catalogue & Inventory Endpoints](#3-product-catalogue--inventory-endpoints)
4. [Shopping Cart Endpoints](#4-shopping-cart-endpoints)
5. [Order Management & Checkout Endpoints](#5-order-management--checkout-endpoints)
6. [Payment Proof & Slip Verification Endpoints](#6-payment-proof--slip-verification-endpoints)
7. [Delivery Rules & Citypak Courier Webhooks](#7-delivery-rules--citypak-courier-webhooks)
8. [Employee Fulfillment Endpoints](#8-employee-fulfillment-endpoints)
9. [Administrator Management Endpoints](#9-administrator-management-endpoints)
10. [Reviews & Feedback Endpoints](#10-reviews--feedback-endpoints)
11. [Standard HTTP Error Codes](#11-standard-http-error-codes)

---

## 1. API Architecture & Standards

All endpoints follow RESTful conventions:
- **Data Exchange Format:** `application/json` (except file uploads using `multipart/form-data`)
- **Global Pipes:** NestJS `ValidationPipe` with `whitelist: true` and `transform: true` rejects unknown fields and coerces primitive query parameters.
- **BigInt Polyfill:** All PostgreSQL bigints are automatically serialized to strings in JSON responses.
- **CORS Protection:** Configured to whitelist authorized storefront domains and local development origins with credentials enabled.

---

## 2. Authentication & Profile Endpoints

### 2.1 Customer Email Registration
- **Route:** `POST /auth/customer/signup`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "customer@example.com",
    "password": "StrongPassword123!",
    "firstName": "Kasun",
    "lastName": "Perera",
    "phone": "+94771234567"
  }
  ```
- **Success Response (`201 Created`):**
  ```json
  {
    "message": "Registration successful. Please check your email to verify your account.",
    "user": {
      "id": "e3f9a721-1182-4ef8-9f3b-638548395f12",
      "email": "customer@example.com",
      "role": "customer"
    }
  }
  ```

### 2.2 Customer Login
- **Route:** `POST /auth/customer/signin`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "customer@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "v1.re_...",
    "profile": {
      "id": "e3f9a721-1182-4ef8-9f3b-638548395f12",
      "username": "kasun_perera",
      "role": "customer",
      "customer_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
    }
  }
  ```

### 2.3 Google OAuth Callback & Profile Completion
- **Route:** `POST /auth/customer/google-signin`
- **Access:** Public
- **Request Body:** `{ "idToken": "google-oauth2-id-token" }`
- **Success Response (`200 OK`):** Returns session tokens and flag `isProfileComplete: boolean`.

---

## 3. Product Catalogue & Inventory Endpoints

### 3.1 Get All Products (Storefront Catalogue)
- **Route:** `GET /product-catalogue`
- **Access:** Public
- **Query Parameters:**
  - `category` *(optional, string)*: Filter by category slug (e.g., `hoodies`, `tees`)
  - `size` *(optional, string)*: Filter by variant size (e.g., `M`, `L`, `XL`)
  - `color` *(optional, string)*: Filter by variant color
  - `minPrice` / `maxPrice` *(optional, number)*: Price range filter
  - `page` *(optional, default: 1)* & `limit` *(optional, default: 12)*
- **Success Response (`200 OK`):**
  ```json
  {
    "data": [
      {
        "product_id": "b328a6f8-45ec-4475-bfa5-98fcf9a6f2bb",
        "name": "Vergo Heavyweight Street Hoodie",
        "description": "450 GSM pure cotton oversized French Terry fleece.",
        "base_price": 7500.00,
        "status": "active",
        "category": { "name": "Hoodies" },
        "variants": [
          {
            "variant_id": "c194b59e-1082-41f2-95f3-181156e5f1b1",
            "sku": "VG-HD-BLK-M",
            "size": "M",
            "color": "Washed Black",
            "price_adjustment": 0.00,
            "calculated_price": 7500.00,
            "images": [
              { "image_url": "https://res.cloudinary.com/vergo/image/upload/v1/hoodie_black_front.webp" }
            ],
            "total_available_stock": 18
          }
        ]
      }
    ],
    "total": 45,
    "page": 1,
    "totalPages": 4
  }
  ```

### 3.2 Get Single Product Details
- **Route:** `GET /product-catalogue/:id`
- **Access:** Public
- **Success Response (`200 OK`):** Full product details with all variant SKUs, multi-branch stock counts, and verified customer reviews.

---

## 4. Shopping Cart Endpoints

### 4.1 Get Authenticated Customer Cart
- **Route:** `GET /cart`
- **Headers:** `Authorization: Bearer <token>`
- **Access:** Customer
- **Success Response (`200 OK`):**
  ```json
  {
    "cart_id": "314f828a-785f-4029-ba9d-541289115fec",
    "items": [
      {
        "cart_item_id": "7821ef9a-410a-4a25-a1c2-c11571408012",
        "variant_id": "c194b59e-1082-41f2-95f3-181156e5f1b1",
        "product_name": "Vergo Heavyweight Street Hoodie",
        "size": "M",
        "color": "Washed Black",
        "unit_price": 7500.00,
        "quantity": 2,
        "subtotal": 15000.00,
        "image_url": "https://res.cloudinary.com/vergo/.../black.webp"
      }
    ],
    "cart_total": 15000.00
  }
  ```

### 4.2 Add or Update Cart Item
- **Route:** `PUT /cart/items`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "variant_id": "c194b59e-1082-41f2-95f3-181156e5f1b1",
    "quantity": 2
  }
  ```
- **Success Response (`200 OK`):** Updated cart object.

---

## 5. Order Management & Checkout Endpoints

### 5.1 Create Order (Checkout Submission)
- **Route:** `POST /orders`
- **Access:** Customer (or Guest with contact details)
- **Request Body:**
  ```json
  {
    "customer": {
      "first_name": "Kasun",
      "last_name": "Perera",
      "email": "kasun@example.com",
      "phone": "+94771234567",
      "customer_type": "registered"
    },
    "shipping": {
      "receiver_name": "Kasun Perera",
      "phone": "+94771234567",
      "address_line_1": "No. 45, Temple Road",
      "address_line_2": "Nawala",
      "city": "Rajagiriya",
      "district": "Colombo",
      "postal_code": "10107",
      "delivery_note": "Leave with security"
    },
    "items": [
      {
        "variant_id": "c194b59e-1082-41f2-95f3-181156e5f1b1",
        "quantity": 1
      }
    ],
    "payment_method": "Bank Transfer",
    "branch_id": "a901f41e-5819-4bfe-9831-285641778104"
  }
  ```
- **Success Response (`201 Created`):**
  ```json
  {
    "order_id": "f51270ae-410a-4467-9c60-843058b8813f",
    "order_number": "VG-2026-10492",
    "order_status": "Pending Payment",
    "product_total": 7500.00,
    "delivery_fee": 350.00,
    "total_amount": 7850.00,
    "payment_proof_required": true,
    "payment_expires_at": "2026-10-20T14:30:00Z"
  }
  ```

### 5.2 Get Customer Order History
- **Route:** `GET /orders/mine`
- **Headers:** `Authorization: Bearer <token>`
- **Access:** Customer
- **Success Response (`200 OK`):** Array of all orders placed by the authenticated customer.

---

## 6. Payment Proof & Slip Verification Endpoints

### 6.1 Upload Bank Transfer Slip
- **Route:** `POST /orders/:orderId/payment-proof`
- **Access:** Customer (Owner of Order)
- **Content-Type:** `multipart/form-data`
- **Form Payload:**
  - `file`: Image (JPG, PNG, WEBP) or PDF receipt slip (Max 5MB)
- **Success Response (`201 Created`):**
  ```json
  {
    "proof_id": "19bfae34-5812-4c6e-b3f9-715182931a02",
    "receipt_url": "https://res.cloudinary.com/vergo/image/upload/v1/receipts/proof_10492.webp",
    "status": "Pending Verification",
    "uploaded_at": "2026-10-19T14:40:00Z"
  }
  ```

### 6.2 Admin Payment Verification
- **Route:** `PATCH /admin/payment-proof/:proofId/review`
- **Headers:** `Authorization: Bearer <admin-token>`
- **Access:** Admin only
- **Request Body:**
  ```json
  {
    "action": "Approve",
    "admin_notes": "Confirmed on BOC Corporate Account"
  }
  ```
- **Success Response (`200 OK`):** Order status updated to `Ready to Process`; stock reservation permanently deducted.

---

## 7. Delivery Rules & Citypak Courier Webhooks

### 7.1 Calculate District Delivery Fee
- **Route:** `GET /delivery-fees/:district`
- **Access:** Public
- **Success Response (`200 OK`):**
  ```json
  {
    "district": "Colombo",
    "fee_amount": 350.00,
    "estimated_days": "1-2 business days"
  }
  ```

### 7.2 Inbound Courier Status Webhook
- **Route:** `POST /integrations/citypak/webhook`
- **Headers:** `X-Citypak-Signature: <hmac-sha256-hash>`
- **Access:** Logistics Partner Only
- **Request Body:**
  ```json
  {
    "tracking_number": "CPK-981729012",
    "order_id": "f51270ae-410a-4467-9c60-843058b8813f",
    "status": "DELIVERED",
    "delivered_at": "2026-10-21T11:20:00Z",
    "received_by": "Kasun (Self)"
  }
  ```
- **Success Response (`200 OK`):** `{ "acknowledged": true }`

---

## 8. Employee Fulfillment Endpoints

### 8.1 List Unclaimed Orders
- **Route:** `GET /employee/orders/ready-to-process`
- **Headers:** `Authorization: Bearer <employee-token>`
- **Access:** Employee / Admin
- **Success Response (`200 OK`):** List of orders needing picking, printing, or packing.

### 8.2 Claim Order
- **Route:** `POST /employee/orders/:orderId/claim`
- **Headers:** `Authorization: Bearer <employee-token>`
- **Access:** Employee
- **Success Response (`200 OK`):**
  ```json
  {
    "order_id": "f51270ae-410a-4467-9c60-843058b8813f",
    "order_status": "Claimed by Employee",
    "assigned_employee_id": "e9812401-2291-4cf1-8729-105191294812"
  }
  ```

### 8.3 Update Preparation Milestone
- **Route:** `PATCH /employee/orders/:orderId/milestone`
- **Headers:** `Authorization: Bearer <employee-token>`
- **Request Body:** `{ "status": "Ready" }`
- **Success Response (`200 OK`):** Milestone logged; customer notified via email/SMS.

---

## 9. Administrator Management Endpoints

### 9.1 Dashboard Analytics Summary
- **Route:** `GET /admin/analytics/overview`
- **Headers:** `Authorization: Bearer <admin-token>`
- **Access:** Admin
- **Success Response (`200 OK`):**
  ```json
  {
    "today_revenue": 145000.00,
    "monthly_revenue": 3820000.00,
    "active_orders": 34,
    "low_stock_variants_count": 5,
    "pending_slips_count": 8
  }
  ```

### 9.2 Add New Product & Generate Variants
- **Route:** `POST /admin/products`
- **Headers:** `Authorization: Bearer <admin-token>`
- **Request Body:**
  ```json
  {
    "name": "Vergo Cyberpunk Windbreaker",
    "category_id": "e4128910-1849-4102-bf19-481920581901",
    "supplier_id": "90128941-1182-4ef8-8719-291850182914",
    "base_price": 9500.00,
    "description": "Waterproof technical jacket with reflective 3M branding.",
    "variants": [
      {
        "sku": "VG-WB-CYB-L",
        "size": "L",
        "color": "Reflective Silver",
        "price_adjustment": 500.00,
        "initial_branch_stock": [
          { "branch_id": "a901f41e-5819-4bfe-9831-285641778104", "quantity": 25 }
        ]
      }
    ]
  }
  ```
- **Success Response (`201 Created`):** Product and nested variants generated.

---

## 10. Reviews & Feedback Endpoints

### 10.1 Get Product Reviews
- **Route:** `GET /reviews/product/:productId`
- **Access:** Public
- **Success Response (`200 OK`):** Array of approved reviews with ratings (1-5 stars) and comments.

### 10.2 Submit Verified Purchase Review
- **Route:** `POST /reviews`
- **Headers:** `Authorization: Bearer <token>`
- **Access:** Customer (Verified order required)
- **Request Body:**
  ```json
  {
    "product_id": "b328a6f8-45ec-4475-bfa5-98fcf9a6f2bb",
    "order_id": "f51270ae-410a-4467-9c60-843058b8813f",
    "rating": 5,
    "comment": "Exceptional fabric thickness and premium stitching! Will buy again."
  }
  ```
- **Success Response (`201 Created`):** `{ "message": "Review submitted for moderation." }`

---

## 11. Standard HTTP Error Codes

| Code | Status Name | Explanation |
| :--- | :--- | :--- |
| `400` | Bad Request | Validation error (e.g. invalid email format, insufficient stock). |
| `401` | Unauthorized | Bearer token missing, malformed, or expired. |
| `403` | Forbidden | Insufficient permissions (e.g. customer attempting to call `/admin/*`). |
| `404` | Not Found | Entity (order, product, variant, user) does not exist. |
| `409` | Conflict | Duplicate resource (e.g. email already registered, order already claimed). |
| `422` | Unprocessable Entity | Slip file format not supported or exceeds 5MB size limit. |
| `500` | Internal Server Error | Unhandled server exception (logged with stack trace). |
