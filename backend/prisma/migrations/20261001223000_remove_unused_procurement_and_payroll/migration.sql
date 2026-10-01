-- Migration: 20261001223000_remove_unused_procurement_and_payroll
-- Description: Safely drop unused procurement (purchase_order, purchase_order_item) and payroll (salary_record) tables and employee_commission.salary_id

-- 1. Drop foreign key and check constraint on employee_commission referencing salary_record
ALTER TABLE "public"."employee_commission"
  DROP CONSTRAINT IF EXISTS "employee_commission_salary_id_fkey",
  DROP CONSTRAINT IF EXISTS "employee_commission_paid_check";

-- Re-apply employee_commission_paid_check without salary_id dependency
ALTER TABLE "public"."employee_commission"
  ADD CONSTRAINT "employee_commission_paid_check" CHECK (
    "status" <> 'Paid' OR "paid_at" IS NOT NULL
  );

-- 2. Drop the salary_id column from employee_commission
ALTER TABLE "public"."employee_commission"
  DROP COLUMN IF EXISTS "salary_id";

-- 3. Drop purchase_order_item table
DROP TABLE IF EXISTS "public"."purchase_order_item" CASCADE;

-- 4. Drop purchase_order table
DROP TABLE IF EXISTS "public"."purchase_order" CASCADE;

-- 5. Drop salary_record table
DROP TABLE IF EXISTS "public"."salary_record" CASCADE;
