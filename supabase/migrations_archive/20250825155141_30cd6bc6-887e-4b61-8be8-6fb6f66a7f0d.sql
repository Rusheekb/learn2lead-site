-- Fix the foreign key constraint issue
-- The class_uploads table currently references class_logs.id but should reference scheduled_classes.id

-- First, drop the existing foreign key constraint
ALTER TABLE class_uploads DROP CONSTRAINT IF EXISTS class_uploads_class_id_fkey;

-- Add the correct foreign key constraint to scheduled_classes
ALTER TABLE class_uploads 
ADD CONSTRAINT class_uploads_class_id_fkey 
FOREIGN KEY (class_id) REFERENCES scheduled_classes(id) ON DELETE CASCADE;