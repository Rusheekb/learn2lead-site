
-- Backfill: Restore previously completed classes onto the calendar
-- by cross-referencing class_logs with profiles to recover tutor_id and student_id.
-- Only processes logs that have a valid Class ID (UUID) and matching profiles.

INSERT INTO scheduled_classes (id, title, tutor_id, student_id, date, start_time, end_time, subject, notes, status, attendance)
SELECT
  cl."Class ID"::uuid AS id,
  COALESCE(cl."Title", cl."Class Number", 'Completed Class') AS title,
  tp.id AS tutor_id,
  sp.id AS student_id,
  cl."Date"::date AS date,
  cl."Time (CST)"::time AS start_time,
  (cl."Time (CST)"::time + (COALESCE(NULLIF(cl."Time (hrs)", ''), '1')::numeric || ' hours')::interval)::time AS end_time,
  COALESCE(cl."Subject", 'General') AS subject,
  cl."Additional Info" AS notes,
  'completed' AS status,
  'present' AS attendance
FROM class_logs cl
-- Match tutor by name or email
JOIN profiles tp ON tp.role = 'tutor' AND (
  TRIM(CONCAT(COALESCE(tp.first_name, ''), ' ', COALESCE(tp.last_name, ''))) = cl."Tutor Name"
  OR tp.email = cl."Tutor Name"
)
-- Match student by name or email
JOIN profiles sp ON sp.role = 'student' AND (
  TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) = cl."Student Name"
  OR sp.email = cl."Student Name"
)
WHERE cl."Class ID" IS NOT NULL
  -- Only insert if not already in scheduled_classes
  AND NOT EXISTS (
    SELECT 1 FROM scheduled_classes sc WHERE sc.id::text = cl."Class ID"
  )
ON CONFLICT (id) DO NOTHING;
