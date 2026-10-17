-- Add payment-related fields to class_logs table
ALTER TABLE class_logs
ADD COLUMN payment_status text DEFAULT 'pending',
ADD COLUMN tutor_payment_status text DEFAULT 'pending',
ADD COLUMN class_cost decimal(10,2) DEFAULT 0.00,
ADD COLUMN tutor_cost decimal(10,2) DEFAULT 0.00; 