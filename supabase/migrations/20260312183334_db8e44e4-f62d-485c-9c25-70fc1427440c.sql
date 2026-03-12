
-- =============================================
-- CLEANUP: Remove duplicate/redundant RLS policies
-- =============================================

-- 1. SCHEDULED_CLASSES
-- Remove duplicate authenticated-role policies (public role already covers authenticated)
DROP POLICY IF EXISTS "Tutors can delete their own classes" ON public.scheduled_classes;
DROP POLICY IF EXISTS "Tutors can insert their own classes" ON public.scheduled_classes;
DROP POLICY IF EXISTS "Tutors can update their own classes" ON public.scheduled_classes;
-- "View access for student_classes view" already covers all three roles, so remove the individual ones
DROP POLICY IF EXISTS "Students can view their scheduled classes" ON public.scheduled_classes;
DROP POLICY IF EXISTS "Tutors can view classes they teach" ON public.scheduled_classes;

-- 2. STUDENT_SUBSCRIPTIONS
-- "admin_full_access_subscriptions" covers admin ALL + student SELECT, making the individual policies redundant
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.student_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.student_subscriptions;
DROP POLICY IF EXISTS "Students can view their own subscriptions" ON public.student_subscriptions;

-- 3. CLASS_CREDITS_LEDGER
-- "admin_or_own_credits_ledger" covers admin + student SELECT, making individual SELECTs redundant
DROP POLICY IF EXISTS "Admins can view all credit history" ON public.class_credits_ledger;
DROP POLICY IF EXISTS "Students can view their own credit history" ON public.class_credits_ledger;

-- 4. TUTOR_STUDENT_ASSIGNED
-- "View access for tutor_students view" covers student, tutor, and admin SELECT
DROP POLICY IF EXISTS "Allow students to select relationships" ON public.tutor_student_assigned;
DROP POLICY IF EXISTS "Allow tutors to select relationships" ON public.tutor_student_assigned;
DROP POLICY IF EXISTS "Tutors can view their own relationships" ON public.tutor_student_assigned;

-- 5. CONTENT_SHARES
-- "Users can share content" duplicates "Students can create content shares" (both INSERT with sender_id = auth.uid())
DROP POLICY IF EXISTS "Students can create content shares" ON public.content_shares;
-- "Users can view content shared with them" covers both sender and receiver, making the student-only SELECT redundant
DROP POLICY IF EXISTS "Students can view content shared with them" ON public.content_shares;
-- "Students can manage their own content shares" (UPDATE on sender_id) overlaps with "Users can update viewed status" (UPDATE on receiver_id)
-- Keep both since they serve different purposes (sender updates vs receiver marking viewed)
-- "Students can delete their own content shares" is unique - keep it
