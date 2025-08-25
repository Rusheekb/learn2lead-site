-- FIX REMAINING SECURITY ISSUES

-- 1. FIX THE REMAINING FUNCTION WITH MISSING SEARCH PATH
CREATE OR REPLACE FUNCTION public.check_upcoming_classes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    classes_cursor CURSOR FOR 
        SELECT sc.id, sc.title, sc.date, sc.start_time, sc.end_time, sc.zoom_link,
               sc.subject, t.email as tutor_email, t.name as tutor_name, 
               s.email as student_email, s.name as student_name
        FROM public.scheduled_classes sc
        JOIN public.tutors t ON sc.tutor_id = t.id
        JOIN public.students s ON sc.student_id = s.id
        WHERE 
            sc.reminder_sent = false
            AND sc.date = CURRENT_DATE
            AND sc.start_time BETWEEN 
                (CURRENT_TIME + interval '50 minutes') 
                AND (CURRENT_TIME + interval '70 minutes');
    
    class_record RECORD;
BEGIN
    OPEN classes_cursor;
    
    LOOP
        FETCH classes_cursor INTO class_record;
        EXIT WHEN NOT FOUND;
        
        UPDATE public.scheduled_classes 
        SET reminder_sent = true
        WHERE id = class_record.id;
        
        RAISE NOTICE 'Found upcoming class: % for % at %:%', 
                     class_record.title, class_record.student_name, 
                     class_record.date, class_record.start_time;
    END LOOP;
    
    CLOSE classes_cursor;
END;
$$;

-- 2. IDENTIFY AND DROP SECURITY DEFINER VIEWS
-- First, let's identify all views with SECURITY DEFINER
-- Drop security definer views (these are the problematic ones)
DROP VIEW IF EXISTS student_classes CASCADE;
DROP VIEW IF EXISTS tutor_students CASCADE;

-- 3. RECREATE AS REGULAR VIEWS (NOT SECURITY DEFINER)
-- Create a safe view for student classes
CREATE VIEW student_classes AS
SELECT 
    sc.id,
    sc.student_id,
    sc.tutor_id,
    sc.date,
    sc.title,
    sc.start_time,
    sc.end_time,
    sc.zoom_link,
    sc.subject,
    sc.notes,
    sc.status,
    sc.attendance,
    COALESCE(tp.first_name || ' ' || tp.last_name, tp.email) as tutor_name,
    COALESCE(sp.first_name || ' ' || sp.last_name, sp.email) as student_name
FROM scheduled_classes sc
LEFT JOIN profiles tp ON sc.tutor_id = tp.id
LEFT JOIN profiles sp ON sc.student_id = sp.id;

-- Create a safe view for tutor students
CREATE VIEW tutor_students AS
SELECT 
    tsa.tutor_id,
    tsa.student_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) as student_name,
    COALESCE(tp.first_name || ' ' || tp.last_name, tp.email) as tutor_name,
    s.subjects,
    s.grade,
    s.payment_status,
    tsa.active,
    tsa.assigned_at
FROM tutor_student_assigned tsa
LEFT JOIN profiles p ON tsa.student_id = p.id
LEFT JOIN profiles tp ON tsa.tutor_id = tp.id
LEFT JOIN students s ON tsa.student_id = s.id;

-- 4. ADD RLS POLICIES TO UNDERLYING TABLES (since we can't add to views)
-- These policies will control access through the views

-- Additional policy for scheduled_classes to ensure proper view access
CREATE POLICY "View access for student_classes view" 
ON scheduled_classes 
FOR SELECT 
USING (
  (get_auth_user_role() = 'student' AND student_id = auth.uid()) OR
  (get_auth_user_role() = 'tutor' AND tutor_id = auth.uid()) OR
  get_auth_user_role() = 'admin'
);

-- Additional policy for tutor_student_assigned to ensure proper view access  
CREATE POLICY "View access for tutor_students view" 
ON tutor_student_assigned 
FOR SELECT 
USING (
  (get_auth_user_role() = 'student' AND student_id = auth.uid()) OR
  (get_auth_user_role() = 'tutor' AND tutor_id = auth.uid()) OR
  get_auth_user_role() = 'admin'
);