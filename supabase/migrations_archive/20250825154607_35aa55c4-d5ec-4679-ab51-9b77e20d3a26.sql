-- Check if there's a foreign key constraint on class_uploads that needs to be updated
-- First, let's see what constraints exist on class_uploads table
SELECT conname, contype, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'class_uploads'::regclass;

-- Let's also check if the foreign key exists but points to the wrong table
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'class_uploads';