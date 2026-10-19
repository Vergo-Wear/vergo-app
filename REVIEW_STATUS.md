# Review Status

This file records whether each completed UI area is connected through the backend to PostgreSQL/Supabase and third-party integrations (Cloudinary, Citypak).

## Connected End to End

| Area | Frontend | Backend | Database & Storage |
| --- | --- | --- | --- |
| Customer email/password signup and signin | `/auth/register`, `/auth/login` | `/auth/customer/signup`, `/auth/customer/signin` | Supabase Auth, `profiles`, `customer`, `role` |
| Google authentication and profile completion | `/auth/register`, `/auth/login` | `/auth/customer/google-signin`, `/auth/customer/google-complete-profile` | Supabase Auth, `profiles`, `customer` |
| Customer address book & default shipping | `/profile` | `/addresses` (`GET`, `POST`, `PUT`, `DELETE`) | `user_addresses` (partial unique index for single primary) |
| Checkout contact lookup | `/checkout` | `/checkout/check-contact` | `customer` |
| Product catalogue browsing & filters | collection screens and product hooks | `/product-catalogue` | `product`, `product_variant`, `color`, `size`, `images`, `inventory`, `category`, `supplier` |
| Two-phase checkout & stock reservation | `/checkout`, `/checkout/shipping`, `/checkout/payment` | `/orders` (`POST`), `/stock-reservation` | `pending_checkout`, `pending_checkout_item`, `stock_reservation`, `inventory` |
| District-based delivery fee calculation | `/checkout/shipping` | `/delivery-fees/:district` | `delivery_fee_rules` |
| Authenticated customer cart | cart controls across the storefront | `/cart` (`GET`, `PUT`, `DELETE`) | `cart`, `cart_item` |
| Payment proof upload & moderation | `/profile/orders/[id]`, `/admin/orders` | `/orders/:orderId/payment-proof`, `/admin/payment-proof` | `payment_proof` + Cloudinary Media CDN |
| Customer and employee profile lookup | login/profile flows | customer, employee, and profile endpoints | `profiles`, `customer`, `employee`, `branch` |
| Customer order history, details, and cancellation | `/profile/orders`, `/profile/orders/[id]` | authenticated `/orders/mine` endpoints | `orders`, `order_item`, `order_customer_details`, `order_shipping_details` |
| Citypak carrier dispatch & tracking | `/profile/orders/[id]/track`, `/employee/delivery-prep`, `/admin/delivery` | `/integrations/citypak/*` (`shipments`, `waybills`, `track`, `pickups`, `sync`, webhook) | `delivery`, `delivery_waybill`, `delivery_tracking_event`, `courier_shipper_profile`, `courier_pickup_request` |
| Product reviews (verified purchase only) | product details | public read and authenticated customer write endpoints | `review`, `review_image` (with Cloudinary) |
| Admin orders, analytics & inventory | admin dashboard (`/admin/*`) | guarded order/admin/analytics endpoints | `orders`, `inventory`, `inventory_commitment`, `product_variant`, `employee` |
| Product & variant creation wizard | `/product-creation` | `POST /admin/products` | `product`, `product_variant`, `color`, `size`, `inventory`, `images` |
| Employee fulfillment queue and availability | `/employee`, `/employee/orders`, `/employee/product-prep` | guarded order status, order claim lock, and employee availability endpoints | `orders`, `employee`, `inventory`, `attendance`, `employee_commission` |
| Contact Us submissions | footer popup | `POST /contact` | `contact_message` / Google Forms integration |

## UI Complete, Integration Pending / Optional Enhancements

| Area | Current source of truth | Status / Notes |
| --- | --- | --- |
| Guest cart | browser session storage | Intentionally client-side temporary; migrated on customer registration |
| Shipping/contact steps draft | browser local storage | Persists draft form until two-phase checkout submission |
| Hardware Bluetooth Barcode Scanner | Keyboard / manual entry in employee UI | Direct Web Bluetooth hardware scanner integration planned for v1.1 |
| Employee stock replenishment requests | The UI displays branch stock alerts | Formal multi-level stock-request approval workflow planned for future release |

## Review Notes

- The backend listens on `PORT` (default `3001`) and enables CORS for `FRONTEND_URL` (default `http://localhost:3000`).
- Frontend API calls use `NEXT_PUBLIC_API_URL` and default to `http://localhost:3001`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend environment files.
- Automated tests mock external Supabase and Citypak calls; live verification uses staging environments.
- Full academic documentation and architecture specifications reside in the `Final Docs/` directory.
