-- Check current RLS status and create security policies for the views
-- Since these are views, we need to create RLS policies that work with the underlying data

-- The student_classes view is based on scheduled_classes + tutors + students
-- The tutor_students view is based on tutors + tutor_student_assigned + students

-- Enable RLS on the views (this should work for views in newer PostgreSQL versions)
-- If this fails, the underlying table policies should still protect the data

-- For student_classes view
CREATE OR REPLACE VIEW public.student_classes WITH (security_barrier=true) AS
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

-- For tutor_students view  
CREATE OR REPLACE VIEW public.tutor_students WITH (security_barrier=true) AS
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