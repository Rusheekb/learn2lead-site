-- Create a temporary function to generate class IDs
CREATE OR REPLACE FUNCTION generate_class_id(
  student_name TEXT,
  tutor_name TEXT,
  class_date DATE,
  existing_ids TEXT[]
) RETURNS TEXT AS $$
DECLARE
  student_initials TEXT;
  tutor_initials TEXT;
  base_id TEXT;
  sequence INT := 1;
  new_id TEXT;
BEGIN
  -- Extract initials (first letter of first and last name)
  student_initials := UPPER(LEFT(SPLIT_PART(student_name, ' ', 1), 1) || LEFT(SPLIT_PART(student_name, ' ', 2), 1));
  tutor_initials := UPPER(LEFT(SPLIT_PART(tutor_name, ' ', 1), 1) || LEFT(SPLIT_PART(tutor_name, ' ', 2), 1));
  
  -- Handle single names
  IF LENGTH(student_initials) < 2 THEN
    student_initials := UPPER(LEFT(student_name, 2));
  END IF;
  IF LENGTH(tutor_initials) < 2 THEN
    tutor_initials := UPPER(LEFT(tutor_name, 2));
  END IF;
  
  -- Generate base ID: SM-JD-20241119
  base_id := student_initials || '-' || tutor_initials || '-' || TO_CHAR(class_date, 'YYYYMMDD');
  
  -- Find next available sequence number
  LOOP
    new_id := base_id || '-' || sequence;
    EXIT WHEN NOT (new_id = ANY(existing_ids));
    sequence := sequence + 1;
  END LOOP;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Update all records with new IDs
DO $$
DECLARE
  record_data RECORD;
  all_ids TEXT[] := '{}';
  new_id TEXT;
BEGIN
  -- Process records ordered by date to maintain sequence consistency
  FOR record_data IN 
    SELECT id, "Student Name", "Tutor Name", "Date"
    FROM class_logs 
    ORDER BY "Date", "Time (CST)"
  LOOP
    -- Generate new ID
    new_id := generate_class_id(
      record_data."Student Name",
      record_data."Tutor Name",
      record_data."Date",
      all_ids
    );
    
    -- Update the record
    UPDATE class_logs
    SET "Class Number" = new_id
    WHERE id = record_data.id;
    
    -- Track used IDs
    all_ids := array_append(all_ids, new_id);
    
    RAISE NOTICE 'Updated record % with ID %', record_data.id, new_id;
  END LOOP;
  
  RAISE NOTICE 'Migration complete! Updated % records', array_length(all_ids, 1);
END $$;

-- Clean up temporary function
DROP FUNCTION generate_class_id;