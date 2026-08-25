
-- Add payment-related fields to class_logs table
-- This migration has already been applied (from 20240314_add_payment_fields.sql)
-- This is included for documentation purposes

ALTER TABLE IF EXISTS class_logs
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS tutor_payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS class_cost decimal(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tutor_cost decimal(10,2) DEFAULT 0.00;
