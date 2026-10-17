-- Create function to sync user roles and create missing student/tutor records
CREATE OR REPLACE FUNCTION public.sync_user_roles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  missing_students_count INTEGER := 0;
  missing_tutors_count INTEGER := 0;
  created_students_count INTEGER := 0;
  created_tutors_count INTEGER := 0;
  profile_record RECORD;
BEGIN
  -- Count missing student records
  SELECT COUNT(*) INTO missing_students_count
  FROM profiles p
  WHERE p.role = 'student' 
  AND NOT EXISTS (
    SELECT 1 FROM students s WHERE s.email = p.email
  );
  
  -- Count missing tutor records  
  SELECT COUNT(*) INTO missing_tutors_count
  FROM profiles p
  WHERE p.role = 'tutor'
  AND NOT EXISTS (
    SELECT 1 FROM tutors t WHERE t.email = p.email
  );
  
  -- Create missing student records
  FOR profile_record IN 
    SELECT p.* FROM profiles p
    WHERE p.role = 'student'
    AND NOT EXISTS (
      SELECT 1 FROM students s WHERE s.email = p.email
    )
  LOOP
    INSERT INTO students (
      name,
      email,
      subjects,
      grade,
      payment_status,
      enrollment_date,
      active
    ) VALUES (
      CASE 
        WHEN TRIM(COALESCE(profile_record.first_name, '')) != '' OR TRIM(COALESCE(profile_record.last_name, '')) != '' THEN
          TRIM(CONCAT(COALESCE(profile_record.first_name, ''), ' ', COALESCE(profile_record.last_name, '')))
        ELSE 
          profile_record.email
      END,
      profile_record.email,
      '{}',
      'Not specified',
      'paid',
      CURRENT_DATE,
      true
    );
    
    created_students_count := created_students_count + 1;
  END LOOP;
  
  -- Create missing tutor records
  FOR profile_record IN 
    SELECT p.* FROM profiles p
    WHERE p.role = 'tutor'
    AND NOT EXISTS (
      SELECT 1 FROM tutors t WHERE t.email = p.email
    )
  LOOP
    INSERT INTO tutors (
      name,
      email,
      subjects,
      hourly_rate,
      active
    ) VALUES (
      CASE 
        WHEN TRIM(COALESCE(profile_record.first_name, '')) != '' OR TRIM(COALESCE(profile_record.last_name, '')) != '' THEN
          TRIM(CONCAT(COALESCE(profile_record.first_name, ''), ' ', COALESCE(profile_record.last_name, '')))
        ELSE 
          profile_record.email
      END,
      profile_record.email,
      '{}',
      25,
      true
    );
    
    created_tutors_count := created_tutors_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'missing_students_found', missing_students_count,
    'missing_tutors_found', missing_tutors_count,
    'students_created', created_students_count,
    'tutors_created', created_tutors_count,
    'message', 'Role sync completed successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Role sync failed'
    );
END;
$$;

-- Create function to automatically sync roles when profiles are created/updated
CREATE OR REPLACE FUNCTION public.auto_sync_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Handle student role
  IF NEW.role = 'student' THEN
    -- Create student record if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM students WHERE email = NEW.email) THEN
      INSERT INTO students (
        name,
        email,
        subjects,
        grade,
        payment_status,
        enrollment_date,
        active
      ) VALUES (
        CASE 
          WHEN TRIM(COALESCE(NEW.first_name, '')) != '' OR TRIM(COALESCE(NEW.last_name, '')) != '' THEN
            TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')))
          ELSE 
            NEW.email
        END,
        NEW.email,
        '{}',
        'Not specified',
        'paid',
        CURRENT_DATE,
        true
      );
    END IF;
    
    -- Remove tutor record if user was previously a tutor
    DELETE FROM tutors WHERE email = NEW.email;
    
  -- Handle tutor role
  ELSIF NEW.role = 'tutor' THEN
    -- Create tutor record if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM tutors WHERE email = NEW.email) THEN
      INSERT INTO tutors (
        name,
        email,
        subjects,
        hourly_rate,
        active
      ) VALUES (
        CASE 
          WHEN TRIM(COALESCE(NEW.first_name, '')) != '' OR TRIM(COALESCE(NEW.last_name, '')) != '' THEN
            TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')))
          ELSE 
            NEW.email
        END,
        NEW.email,
        '{}',
        25,
        true
      );
    END IF;
    
    -- Remove student record if user was previously a student
    DELETE FROM students WHERE email = NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic role sync
DROP TRIGGER IF EXISTS auto_sync_user_role_trigger ON public.profiles;
CREATE TRIGGER auto_sync_user_role_trigger
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_sync_user_role();

-- Execute the sync function to fix existing issues
SELECT public.sync_user_roles();