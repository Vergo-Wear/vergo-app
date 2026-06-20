# vergo-app
A custom order management web application with customer ordering, employee dashboard, admin management, payment handling, notifications, and Koombiyo delivery integration.

## Tech Stack
- **Frontend**: Next.js (React)
- **Backend**: NestJS (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Integrations**: Email notifications, WhatsApp notifications, Koombiyo Delivery API

## Folder Structure
```
frontend/
├─ app/
├─ components/
├─ constants/
├─ hooks/
├─ lib/
├─ services/
├─ types/
└─ utils/
```

*(Backend, Database, Integrations, and Testing folders to be added in future phases)*

## Backend - NestJS

#### Project Setup
- Set up NestJS project
- Set up environment configuration
- Create backend folder structure
- Create test API route
- Test backend server locally

#### Authentication and Roles
- Create auth module
- Create role guard
- Create customer role access
- Create employee role access
- Create admin role access
- Connect Supabase Auth with backend

#### Product APIs
- Create products module
- Create get all products API
- Create get product by ID API
- Create create product API
- Create update product API
- Create delete product API
- Create product image API

#### Order APIs
- Create orders module
- Create create order API
- Create get customer orders API
- Create get all orders API
- Create get order details API
- Create update order status API
- Create order items module

#### Payment APIs
- Create payments module
- Create Cash on Delivery payment flow
- Create Bank Transfer payment flow
- Create payment proof upload handling
- Create payment approval API
- Create payment rejection API

#### Admin APIs
- Create admin management APIs
- Create user management API
- Create employee management API
- Create product management API
- Create admin reports API

#### Notification APIs
- Create notification module
- Create order ready notification API
- Create email notification function
- Create WhatsApp notification function

#### Delivery APIs
- Create delivery module
- Create Koombiyo delivery request API
- Send delivery details to Koombiyo
- Test Koombiyo API response

## Database - Supabase

### Database Schema
- Create profiles table
- Create products table
- Create product images table
- Create orders table
- Create order items table
- Create payments table
- Create delivery details table
- Create notifications table

### Auth and Roles
- Set up Supabase Auth
- Add role field for customer, employee, and admin
- Create customer profile flow
- Create employee profile flow
- Create admin profile flow
- Test role-based access

### Storage
- Create payment proof storage bucket
- Create product images storage bucket
- Set upload rules for payment proof
- Set upload rules for product images
- Test file upload

### Security Policies
- Add Row Level Security policies
- Create customer access policies
- Create employee access policies
- Create admin access policies
- Test customer role database access
- Test employee role database access
- Test admin role database access

### Seed Data
- Add sample product data
- Add sample customer account
- Add sample employee account
- Add sample admin account
- Add sample orders

## Integrations

### Email Notifications
- Research email notification service
- Choose email provider
- Create email notification function
- Send order confirmation email
- Send order ready email
- Test email notification

### WhatsApp Notifications
- Research WhatsApp notification service
- Choose WhatsApp provider
- Create WhatsApp message function
- Send order update message
- Send product ready message
- Test WhatsApp notification

### Koombiyo Delivery
- Get Koombiyo API details
- Study Koombiyo API requirements
- Create Koombiyo delivery request function
- Send customer delivery details to Koombiyo
- Send order details to Koombiyo
- Test Koombiyo delivery sending
- Handle Koombiyo API errors

## Testing and Deployment

### Manual Testing
- Test customer registration
- Test customer login
- Test product browsing
- Test cart flow
- Test checkout flow
- Test Cash on Delivery order
- Test Bank Transfer order
- Test payment proof upload
- Test employee order update
- Test payment approval flow
- Test admin product management
- Test admin user management
- Test notification flow
- Test Koombiyo delivery flow
- Test full order flow

### Bugs
- Create bug tracking process
- Fix frontend UI bugs
- Fix backend API bugs
- Fix database policy issues
- Fix notification issues
- Fix Koombiyo delivery issues
- Fix deployment issues

### Deployment
- Research frontend deployment option
- Deploy frontend
- Research backend deployment option
- Deploy backend
- Connect production Supabase
- Set production environment variables
- Run production test

### Final Review
- Review full customer flow
- Review employee dashboard flow
- Review admin dashboard flow
- Review database security
- Review final documentation
- Prepare final project report
- Prepare final presentation slides

## Folder Structure (Full)

```
frontend/
├─ app/
├─ components/
├─ constants/
├─ hooks/
├─ lib/
├─ services/
├─ types/
└─ utils/
backend/
├─ Project Setup/
├─ Authentication and Roles/
├─ Product APIs/
├─ Order APIs/
├─ Payment APIs/
├─ Admin APIs/
├─ Notification APIs/
└─ Delivery APIs/
database/
├─ Database Schema/
├─ Auth and Roles/
├─ Storage/
├─ Security Policies/
└─ Seed Data/
integrations/
├─ Email Notifications/
├─ WhatsApp Notifications/
└─ Koombiyo Delivery/
testing_and_deployment/
├─ Manual Testing/
├─ Bugs/
├─ Deployment/
└─ Final Review/
```
