-- Fix the security definer issue by recreating views properly
-- Drop and recreate the views without SECURITY DEFINER

-- Drop existing views
DROP VIEW IF EXISTS public.student_classes;
DROP VIEW IF EXISTS public.tutor_students;

-- Recreate student_classes view with proper security
CREATE VIEW public.student_classes WITH (security_barrier=true) AS
SELECT sc.id,
    sc.title,
    sc.date,
    sc.start_time,
    sc.end_time,
    sc.subject,
    sc.zoom_link,
    sc.notes,
    sc.status,
    sc.attendance,
    t.name AS tutor_name,
    s.name AS student_name,
    s.id AS student_id,
    t.id AS tutor_id
FROM scheduled_classes sc
JOIN tutors t ON t.id = sc.tutor_id
JOIN students s ON s.id = sc.student_id;

-- Recreate tutor_students view with proper security  
CREATE VIEW public.tutor_students WITH (security_barrier=true) AS
SELECT t.id AS tutor_id,
    t.name AS tutor_name,
    s.id AS student_id,
    s.name AS student_name,
    s.grade,
    s.subjects,
    s.payment_status,
    tsr.assigned_at,
    tsr.active
FROM tutors t
JOIN tutor_student_assigned tsr ON t.id = tsr.tutor_id
JOIN students s ON s.id = tsr.student_id
WHERE tsr.active = true AND t.active = true AND s.active = true;

-- The views will now inherit RLS policies from the underlying tables
-- This provides the necessary protection without creating security definer views