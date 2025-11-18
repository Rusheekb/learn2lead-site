-- Migration: Convert Class Cost and Tutor Cost from TEXT to NUMERIC
-- This migration safely converts cost columns from TEXT to NUMERIC type
-- Step 1: Add new numeric columns
ALTER TABLE class_logs 
ADD COLUMN class_cost_numeric NUMERIC(10, 2),
ADD COLUMN tutor_cost_numeric NUMERIC(10, 2);

-- Step 2: Migrate data - strip non-numeric characters and convert
UPDATE class_logs 
SET class_cost_numeric = CASE 
  WHEN "Class Cost" IS NULL OR TRIM("Class Cost") = '' THEN NULL
  ELSE CAST(REGEXP_REPLACE("Class Cost", '[^0-9.-]', '', 'g') AS NUMERIC(10, 2))
END;

UPDATE class_logs 
SET tutor_cost_numeric = CASE 
  WHEN "Tutor Cost" IS NULL OR TRIM("Tutor Cost") = '' THEN NULL
  ELSE CAST(REGEXP_REPLACE("Tutor Cost", '[^0-9.-]', '', 'g') AS NUMERIC(10, 2))
END;

-- Step 3: Drop old TEXT columns
ALTER TABLE class_logs 
DROP COLUMN "Class Cost",
DROP COLUMN "Tutor Cost";

-- Step 4: Rename new columns to original names
ALTER TABLE class_logs 
RENAME COLUMN class_cost_numeric TO "Class Cost";

ALTER TABLE class_logs 
RENAME COLUMN tutor_cost_numeric TO "Tutor Cost";

-- Add helpful comment
COMMENT ON COLUMN class_logs."Class Cost" IS 'Cost charged to student for the class (numeric)';
COMMENT ON COLUMN class_logs."Tutor Cost" IS 'Cost paid to tutor for the class (numeric)';