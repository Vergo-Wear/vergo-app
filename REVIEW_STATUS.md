# Review Status

This file records whether each completed UI area is connected through the backend to PostgreSQL/Supabase. A completed screen is not necessarily an end-to-end database integration.

## Connected End to End

| Area | Frontend | Backend | Database |
| --- | --- | --- | --- |
| Customer email/password signup and signin | `/auth/register`, `/auth/login` | `/auth/customer/signup`, `/auth/customer/signin` | Supabase Auth, `profiles`, `customer`, `role` |
| Google authentication and profile completion | `/auth/register`, `/auth/login` | `/auth/customer/google-signin`, `/auth/customer/google-complete-profile` | Supabase Auth, `profiles`, `customer` |
| Checkout contact lookup | `/checkout` | `/checkout/check-contact` | `customer` |
| Product catalogue browsing | collection screens and product hooks | `/product-catalogue` | product, variant, image, inventory, category, supplier tables |
| Order creation | `/checkout/payment` | `POST /orders` | orders, order items, delivery details, payments, inventory |
| Authenticated customer cart | cart controls across the storefront | `GET/PUT/DELETE /cart` | one JSON cart per customer in `cart` |
| Payment proof upload | order details screen | `POST /orders/:orderId/payment-proof` | payment record plus Supabase storage |
| Customer and employee profile lookup | login/profile flows | customer, employee, and profile endpoints | `profiles`, `customer`, `employee` |
| Customer order history, details, and cancellation | `/profile/orders` | authenticated `/orders/mine` endpoints | `orders` and related order tables |
| Product reviews | product details | public read and authenticated customer write endpoints | `review` |
| Admin orders and inventory | admin dashboard | guarded order/admin endpoints | orders, inventory, variants, employees |
| Product creation | admin product creation | `POST /admin/products` | product, variants, inventory, images |
| Employee fulfillment queue and availability | employee dashboard | guarded order status and employee availability endpoints | orders, employees, inventory |
| Contact Us submissions | footer popup | `POST /contact` | `contact_message` |

## UI Complete, Integration Pending

| Area | Current source of truth | Required backend work |
| --- | --- | --- |
| Guest cart | browser session storage | Intentionally temporary; cleared on refresh or tab close |
| Shipping/contact steps | browser local storage until order creation | Optional draft-checkout API |
| Package carrier tracking | no invented tracking data is displayed | Add a delivery-provider integration and delivery table when credentials are available |
| Employee stock requests | the UI reports that the workflow is unavailable | Add stock-request approval tables and endpoints |

## Review Notes

- The backend listens on `PORT` (default `3001`) and enables CORS for `FRONTEND_URL` (default `http://localhost:3000`).
- Frontend API calls use `NEXT_PUBLIC_API_URL` and default to `http://localhost:3001`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend environment files.
- Backend tests mock external Supabase calls; a configured database is still required for a live end-to-end verification.
