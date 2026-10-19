# Vergo Wear - Courier Logistics (Citypak) & Concurrency Architecture
**Course:** Team Software Project (CSC304S3 / CSC304G3)  
**System:** Vergo Wear Custom Apparel & E-Commerce Platform  
**Document Version:** 1.0.0  
**Logistics Partner:** Citypak Couriers (Falcon Client Panel API v0.2.5)  
**Concurrency Engine:** PostgreSQL ACID Transactions (`prisma.$transaction`) & Optimistic Locking  

---

## Table of Contents
1. [Courier Service & Citypak Integration Architecture](#1-courier-service--citypak-integration-architecture)
   - 1.1 Citypak & Falcon API Ecosystem Overview
   - 1.2 Authentication & Environment Configuration
   - 1.3 Character Sanitization & ASCII Compliance
   - 1.4 Multi-Branch Shipper Return Profiles
   - 1.5 Automated Shipment Registration & Consignment Creation
   - 1.6 Thermal Barcode Waybill Streaming (4x6 & A4 PDF Engine)
   - 1.7 Real-Time Tracking & Inbound Webhook Verification
   - 1.8 Bulk Courier Rider Pickup Requests
2. [Comprehensive Concurrency & Race Condition Defense](#2-comprehensive-concurrency--race-condition-defense)
   - 2.1 Concurrency Threat Matrix in Apparel E-Commerce
   - 2.2 Pattern 1: Flash-Drop Stock Reservation (Check-and-Decrement)
   - 2.3 Pattern 2: Multi-Employee Competitive Order Claiming Lock
   - 2.4 Pattern 3: Bank Slip Replacement & Cloudinary Asset Invalidation
   - 2.5 Pattern 4: Atomic Primary Address Switching via Partial Unique Indexes
   - 2.6 Pattern 5: Webhook Idempotency & Tracking Event Deduplication
   - 2.7 Pattern 6: Single-Review Purchase Integrity Lock
   - 2.8 Pattern 7: Scheduled Expiration & Restock Cron Worker Concurrency

---

## 1. Courier Service & Citypak Integration Architecture

### 1.1 Citypak & Falcon API Ecosystem Overview

In Sri Lanka's domestic apparel market, logistics fulfillment relies heavily on third-party parcel carriers capable of handling Cash on Delivery (COD) collection and island-wide multi-district coverage. Vergo Wear integrates directly with **Citypak Couriers** via their modern **Falcon Client Panel API** (Documentation v0.2.5).

The Citypak integration is implemented inside the backend module `backend/src/integrations/citypak`:
- `citypak.controller.ts`: Guarded REST endpoints for shipment creation, waybill streaming, pickup booking, and tracking.
- `citypak.service.ts`: Core logistics engine orchestrating API calls, data transformation, database updates, and error handling.
- `citypak-webhook.controller.ts`: Webhook listener for real-time delivery status updates.
- Dedicated database tables: `delivery`, `delivery_waybill`, `delivery_tracking_event`, `courier_shipper_profile`, `courier_pickup_request`, and `courier_pickup_delivery`.

---

### 1.2 Authentication & Environment Configuration

Communication with Citypak's gateway uses Bearer Token authentication over TLS 1.3:

```env
# Backend .env configuration
CITYPAK_BASE_URL="https://staging.citypak.lk" # or https://api.citypak.lk in production
CITYPAK_API_TOKEN="[SECRET_BEARER_TOKEN_FROM_FALCON_PORTAL]"
CITYPAK_WEBHOOK_SECRET="[HMAC_SECRET_FOR_SIGNATURE_VERIFICATION]"
```

The service validates token presence on bootstrap. If the token is missing or expired, requests fail fast with a descriptive `BadRequestException`.

---

### 1.3 Character Sanitization & ASCII Compliance

The Citypak Falcon API requires strict ASCII characters for receiver names, remarks, and addresses. Non-ASCII characters (e.g. Sinhala/Tamil script or unsupported symbols) cause silent API rejections.

To protect against rejected consignments, `CitypakService` enforces an upfront regex validation rule:
```typescript
private validateAscii(text: string | null | undefined, fieldName: string): void {
  if (!text) return;
  const nonAsciiRegex = /[^\x00-\x7F]+/;
  if (nonAsciiRegex.test(text)) {
    throw new BadRequestException(
      `The field "${fieldName}" contains non-ASCII characters that Citypak does not accept. Please correct it.`
    );
  }
}
```
All customer shipping fields (`addressLine1`, `city`, `receiverName`, `deliveryNote`) are sanitized before initiating courier dispatch calls.

---

### 1.4 Multi-Branch Shipper Return Profiles

When packages cannot be delivered (e.g., recipient unreachable), parcels must be returned to the correct originating branch warehouse rather than an arbitrary location.

The system utilizes `public.courier_shipper_profile`:
1. When dispatching from a specific branch (e.g., Kandy Production Hub), the system looks up the shipper profile registered for that `branch_id`.
2. If none is configured, it falls back to the default Main Warehouse profile (`isDefault = true`).
3. Shipper profile details include: `shipperName`, `addressLine1`, `addressLine4City`, `contactName`, and `contactNumber1`.

---

### 1.5 Automated Shipment Registration & Consignment Creation

When an employee completes garment preparation and packages an order (`/employee/delivery-prep`), they trigger `POST /integrations/citypak/shipments/:orderId`.

#### The Consignment Creation Workflow:
1. **Order Validation:** Ensures the order is in `Ready` status and not already submitted to courier (`submission_status != 'Submitted'`).
2. **Volumetric & Weight Calculation:** Accepts package weight in grams (`weightGrams`), piece count (`numberOfPieces`), and dimensions (`lengthCm`, `widthCm`, `heightCm`).
3. **COD Amount Resolution:** If the payment method was `Cash on Delivery`, the consignment registers `codAmount = orders.total_amount`. If paid via Bank Transfer, `codAmount = 0`.
4. **Falcon API Dispatch:** Sends a payload to Citypak `POST /client/orders` containing sender, recipient, package, and cash collection parameters.
5. **Atomic Persistence:** In a single database transaction:
   - Updates `public.delivery` with `waybillNumber`, `courierReference`, `submittedAt`, and `submissionStatus = 'Submitted'`.
   - Inserts waybill barcode records into `public.delivery_waybill`.
   - Advances order status to `Sent for Delivery`.
   - Dispatches customer notification (Email/SMS) containing the live tracking link.

---

### 1.6 Thermal Barcode Waybill Streaming (4x6 & A4 PDF Engine)

Workshop staff do not need to log into the third-party Citypak portal to print labels. The Vergo Wear backend streams printer-ready PDF waybills directly:

- **Single Order Thermal Label:**  
  `GET /integrations/citypak/waybills/order/:orderId?pageSize=4X6&perPage=1`  
  Streams a standard 4x6-inch adhesive thermal shipping label containing the Code 128 barcode, airway bill number, receiver address, and COD cash collection badge.
- **Bulk Batch Manifest:**  
  `GET /integrations/citypak/waybills/tracking?trackingNumbers=CPK101,CPK102&pageSize=A4&perPage=4`  
  Generates an A4 summary manifest for dispatch handoff to courier drivers.

---

### 1.7 Real-Time Tracking & Inbound Webhook Verification

Tracking occurs through two synchronized channels:

#### A. Inbound Webhook Listener (`POST /integrations/citypak/webhook`)
Citypak's sorting centers dispatch automated webhooks as parcels move across transit hubs.
- **HMAC Signature Check:** Verifies the `X-Citypak-Signature` header against `CITYPAK_WEBHOOK_SECRET` to prevent forged status injection.
- **Status Mapping:** Maps courier statuses (`PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `RETURNED`) to Vergo internal delivery states.
- **Milestone Persistence:** Appends an entry into `public.delivery_tracking_event` storing timestamp, facility location, and description.
- **Order Closure:** When status is `DELIVERED`, the system automatically marks `orders.delivered_at = NOW()`, promotes order status to `Delivered`, and triggers staff commission allocation.

#### B. Scheduled Background Sync Cron
To handle potential network drops or missed webhooks:
```typescript
@Cron(CronExpression.EVERY_30_MINUTES)
async syncActiveShipments() {
  // Queries all packages in 'In Transit' or 'Pending' and refreshes latest status
}
```

---

### 1.8 Bulk Courier Rider Pickup Requests

When a batch of orders is packed and ready at a retail branch, staff request a courier truck pickup via `POST /integrations/citypak/pickups`.
- Staff select the pickup window (`pickup_from_datetime` to `pickup_to_datetime`), branch address, estimated piece count, and gross weight.
- The system generates an official `courier_pickup_request` record and associates the included parcel IDs via `courier_pickup_delivery`.
- Citypak dispatches a courier driver directly to the selected branch.

---

## 2. Comprehensive Concurrency & Race Condition Defense

In high-concurrency environments (such as limited apparel drops, promotional sales, and multi-employee workshops), race conditions can corrupt data, oversell inventory, or trigger duplicate payments. Vergo Wear enforces strict concurrency controls across every critical operational path.

### 2.1 Concurrency Threat Matrix

| Operational Path | Concurrency Threat / Race Condition | Architectural Defense in Vergo Wear |
| :--- | :--- | :--- |
| **Garment Stock Reservation** | 100 shoppers attempt to buy the last 2 hoodies simultaneously. | Atomic check-and-decrement inside `prisma.$transaction` with row-level locks. |
| **Order Claiming Queue** | Two floor employees click "Claim Order" on the same order at the same second. | Conditional update query enforcing `employee_id IS NULL`. Exactly one succeeds. |
| **Bank Slip Replacement** | Customer uploads a new slip while previous upload is being audited. | Atomic slip replacement transaction with deferred Cloudinary CDN deletion. |
| **Primary Address Selection** | User rapidly clicks "Make Primary" on two different saved addresses. | Atomic transaction + PostgreSQL partial unique index `user_addresses_one_primary_per_customer`. |
| **Courier Webhook Retries** | Citypak sends duplicate delivery webhooks within milliseconds. | Idempotent upserts on `delivery_tracking_event` and `delivery`. |
| **Single-Review Integrity** | User double-clicks "Submit Review" or sends parallel POST requests. | `UNIQUE (order_item_id)` database constraint on `review`. |
| **Stock Expiration Worker** | Scheduled cron job runs while customer is uploading receipt slip. | State checking: only checkouts strictly in `'Awaiting Payment'` are expired. |

---

### 2.2 Pattern 1: Flash-Drop Stock Reservation (Check-and-Decrement)

Standard ORM approaches read available stock first, check if `quantity >= requested`, and then issue an update. Under concurrent loads, this "check-then-act" pattern causes severe overselling.

**Vergo Wear Implementation:**  
The check and decrement are combined into an atomic SQL transaction:

```typescript
// Inside OrdersService / StockReservationService
await this.prisma.$transaction(async (tx) => {
  // Atomic check-and-decrement: returns updated record only if condition holds
  const updatedInventory = await tx.$executeRaw`
    UPDATE public.inventory 
    SET quantity = quantity - ${requestedQty}
    WHERE inventory_id = ${inventoryId}::uuid 
      AND quantity >= ${requestedQty}
  `;

  if (updatedInventory === 0) {
    throw new BadRequestException('Selected garment variant is out of stock.');
  }

  // Create corresponding reservation lock record
  await tx.stockReservation.create({
    data: {
      inventoryId,
      checkoutId,
      quantity: requestedQty,
      status: 'Active',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
});
```

Because PostgreSQL locks the matched row during the `UPDATE`, concurrent transactions wait in line and evaluate against the decremented quantity. Negative inventory is physically impossible.

---

### 2.3 Pattern 2: Multi-Employee Competitive Order Claiming Lock

In busy workshops, multiple staff members monitor the `/employee/orders` queue. When a new order appears in `Ready to Process`, multiple workers might click "Claim" at the exact same instant.

**Vergo Wear Implementation:**  
Order assignment uses a conditional update with zero-collision locking:

```typescript
// Inside EmployeesService
async claimOrder(orderId: string, employeeId: string) {
  return this.prisma.$transaction(async (tx) => {
    // Attempt conditional assignment
    const result = await tx.$executeRaw`
      UPDATE public.orders 
      SET employee_id = ${employeeId}::uuid,
          order_status = 'Claimed by Employee',
          claimed_at = NOW()
      WHERE order_id = ${orderId}::uuid 
        AND employee_id IS NULL 
        AND order_status = 'Ready to Process'
    `;

    if (result === 0) {
      throw new ConflictException(
        'This order has already been claimed by another team member or is no longer available.'
      );
    }

    return tx.orders.findUnique({ where: { orderId } });
  });
}
```

The database guarantees that only the first committed transaction updates the row; all subsequent simultaneous attempts affect 0 rows and return a clean `409 ConflictException`.

---

### 2.4 Pattern 3: Bank Slip Replacement & Cloudinary Asset Invalidation

If a customer uploads a blurry bank slip and immediately uploads a clearer photo, race conditions could cause the database to point to the new image while Cloudinary retains orphaned files or deletes the wrong asset.

**Vergo Wear Implementation:**
1. A transaction updates `public.payment_proof` with the new Cloudinary URL and `storage_public_id`.
2. The transaction extracts and returns the *old* `storage_public_id`.
3. Only **after** the transaction successfully commits to PostgreSQL does `CloudinaryService.deleteAsset(oldPublicId)` execute:
   ```typescript
   const replacedPublicId = await this.prisma.$transaction(async (tx) => {
     const existing = await tx.paymentProof.findUnique({ where: { checkoutId } });
     await tx.paymentProof.upsert({
       where: { checkoutId },
       update: { fileUrl: newUrl, storagePublicId: newPublicId },
       create: { checkoutId, fileUrl: newUrl, storagePublicId: newPublicId },
     });
     return existing?.storagePublicId;
   });

   // Safe post-commit asset destruction
   if (replacedPublicId) {
     await this.cloudinaryService.deleteAsset(replacedPublicId);
   }
   ```

If the database write fails, the old Cloudinary receipt is preserved and no data corruption occurs.

---

### 2.5 Pattern 4: Atomic Primary Address Switching via Partial Unique Indexes

A customer may save multiple delivery addresses, but exactly one can be primary (`is_primary = true`). If a user opens two tabs and sets two different addresses as primary simultaneously, application-level checks can fail.

**Vergo Wear Implementation:**
1. **Database Constraint:** A PostgreSQL partial unique index is enforced in `user-addresses.sql`:
   ```sql
   CREATE UNIQUE INDEX user_addresses_one_primary_per_customer 
   ON public.user_addresses (customer_id) 
   WHERE (is_primary = true);
   ```
2. **Transaction Demotion:** When a new primary address is designated, the service executes:
   ```typescript
   await this.prisma.$transaction(async (tx) => {
     // Demote all existing primary addresses for this customer
     await tx.userAddresses.updateMany({
       where: { customerId, isPrimary: true },
       data: { isPrimary: false },
     });

     // Promote the requested address
     return tx.userAddresses.update({
       where: { addressId },
       data: { isPrimary: true },
     });
   });
   ```

Even if two concurrent requests bypass application logic, the database engine guarantees that at most one row can hold `is_primary = true`.

---

### 2.6 Pattern 5: Webhook Idempotency & Tracking Event Deduplication

Logistics networks frequently retry webhook deliveries if acknowledgment responses take longer than a few hundred milliseconds. Duplicate webhooks can cause duplicate tracking logs or redundant notification triggers.

**Vergo Wear Implementation:**
- Events are logged with transactional upserts or unique idempotency keys:
  ```typescript
  await tx.deliveryTrackingEvent.upsert({
    where: {
      trackingNumber_eventAt: {
        trackingNumber: payload.tracking_number,
        eventAt: new Date(payload.event_datetime),
      },
    },
    update: { status: payload.status, location: payload.location },
    create: { ...payload },
  });
  ```
- If an event with the identical tracking number and timestamp has already been recorded, it is updated in place rather than duplicated.

---

### 2.7 Pattern 6: Single-Review Purchase Integrity Lock

To prevent spam or concurrent duplicate reviews on the same purchased item:
- `public.review` enforces `order_item_id uuid NOT NULL UNIQUE`.
- Review creation verifies:
  1. The authenticated customer owns the order.
  2. The order status is `Delivered` or `Completed`.
  3. No review exists for that `order_item_id`.
- The database unique constraint guarantees that simultaneous submissions from the same user fail cleanly with a `409 ConflictException`.

---

### 2.8 Pattern 7: Scheduled Expiration & Restock Worker Concurrency

The backend runs a scheduled cron job (`StockReservationCron`) every hour to cancel unpaid bank transfer checkouts older than 24 hours and restock inventory.

**Concurrency Guard:**
- The worker executes an atomic state transition:
  ```sql
  UPDATE public.pending_checkout 
  SET status = 'Expired'
  WHERE status = 'Awaiting Payment' 
    AND expires_at < NOW();
  ```
- If a customer uploads their receipt slip at the same moment the cron runs, the slip upload updates the status to `'Pending Verification'`. The cron's `WHERE status = 'Awaiting Payment'` clause automatically excludes it, preventing premature cancellation of valid customer payments.
