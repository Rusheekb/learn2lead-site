-- Add new date columns for payment tracking
ALTER TABLE class_logs 
ADD COLUMN student_payment_date DATE,
ADD COLUMN tutor_payment_date DATE;

-- Migrate existing payment dates from Additional Info field
-- This handles 2-digit years (assuming 20XX) and various date formats
UPDATE class_logs
SET student_payment_date = CASE 
  WHEN "Additional Info" ~ 'Student paid: \d{1,2}/\d{1,2}/\d{2,4}' THEN
    TO_DATE(
      REGEXP_REPLACE(
        SUBSTRING("Additional Info" FROM 'Student paid: (\d{1,2}/\d{1,2}/\d{2,4})'),
        '(\d{1,2})/(\d{1,2})/(\d{2})$',
        '\1/\2/20\3'
      ),
      'MM/DD/YYYY'
    )
  ELSE NULL
END
WHERE "Additional Info" IS NOT NULL;

UPDATE class_logs
SET tutor_payment_date = CASE 
  WHEN "Additional Info" ~ 'Tutor paid: \d{1,2}/\d{1,2}/\d{2,4}' THEN
    TO_DATE(
      REGEXP_REPLACE(
        SUBSTRING("Additional Info" FROM 'Tutor paid: (\d{1,2}/\d{1,2}/\d{2,4})'),
        '(\d{1,2})/(\d{1,2})/(\d{2})$',
        '\1/\2/20\3'
      ),
      'MM/DD/YYYY'
    )
  ELSE NULL
END
WHERE "Additional Info" IS NOT NULL;

-- Drop old text-based payment status columns after migration
ALTER TABLE class_logs 
DROP COLUMN "Student Payment",
DROP COLUMN "Tutor Payment";