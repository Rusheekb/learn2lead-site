-- class_logs write lockdown.
--
-- The app's real completion path (complete_class_atomic, SECURITY DEFINER) always
-- INSERTs the log row itself, locked and validated against scheduled_classes. But RLS
-- separately granted tutors blanket INSERT/UPDATE/DELETE, and granted students a
-- blanket FOR ALL — neither requirement checked that the row corresponds to a real
-- scheduled class or went through the safe completion RPC. A direct API call
-- (devtools, browser extension, compromised session) could fabricate a paid class,
-- edit hours/cost after payroll, or delete a log entirely — invisible to every
-- safeguard complete_class_atomic provides.
--
-- The app only uses two narrow direct writes today (confirmed by grep of src/):
--   - tutors editing Content/HW after the fact (ClassHistory.tsx handleSaveEdit)
--   - students leaving a rating/feedback (ClassHistory.tsx handleSaveRating)
-- Everything else (INSERT, DELETE, and any other column on UPDATE) has no legitimate
-- direct caller and is removed/blocked.
--
-- Note: the student side (SELECT + a rating-only UPDATE, no INSERT/DELETE) was
-- already narrowed by migration 20260702000001_rls_fix_and_class_reminders.sql — that
-- part doesn't need touching here. This migration only needs to fix tutors, who still
-- have blanket INSERT/UPDATE/DELETE from 20260701000006. It also adds the trigger
-- below, which extends real protection to students too: their existing UPDATE policy
-- only restricts by row, not by column, so a student could otherwise still overwrite
-- "Tutor Cost" or any other field on their own log.

-- 1. Drop the blanket tutor insert/update/delete policies.
DROP POLICY IF EXISTS "Tutors can insert class logs" ON public.class_logs;
DROP POLICY IF EXISTS "Tutors can update their own class logs" ON public.class_logs;
DROP POLICY IF EXISTS "Tutors can delete their own class logs" ON public.class_logs;

-- 2. Tutors: narrow update for Content/HW only (columns enforced by trigger below),
-- no insert/delete — completion always goes through complete_class_atomic instead.
CREATE POLICY "Tutors can edit notes on their own class logs"
ON public.class_logs
FOR UPDATE
TO public
USING (
  get_auth_user_role() = 'tutor'
  AND (
    "Tutor Name" = get_auth_user_display_name()
    OR "Tutor Name" = get_auth_user_email()
    OR tutor_user_id = auth.uid()
  )
);

-- 4. RLS gates rows, not columns — a tutor/student UPDATE that satisfies the row
-- check above could still touch any column, including payroll fields ("Tutor Cost",
-- "Student Payment", hours) or ownership fields (student_user_id, tutor_user_id).
-- This trigger enforces the narrow column allowlist per role. Admins are exempt.
CREATE OR REPLACE FUNCTION public.enforce_class_logs_update_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := get_auth_user_role();
BEGIN
  IF v_role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF v_role = 'tutor' THEN
    IF NEW."Date" IS DISTINCT FROM OLD."Date"
      OR NEW."Day" IS DISTINCT FROM OLD."Day"
      OR NEW."Time (CST)" IS DISTINCT FROM OLD."Time (CST)"
      OR NEW."Time (hrs)" IS DISTINCT FROM OLD."Time (hrs)"
      OR NEW."Student Name" IS DISTINCT FROM OLD."Student Name"
      OR NEW."Tutor Name" IS DISTINCT FROM OLD."Tutor Name"
      OR NEW."Subject" IS DISTINCT FROM OLD."Subject"
      OR NEW."Additional Info" IS DISTINCT FROM OLD."Additional Info"
      OR NEW."Class ID" IS DISTINCT FROM OLD."Class ID"
      OR NEW."Class Number" IS DISTINCT FROM OLD."Class Number"
      OR NEW."Class Cost" IS DISTINCT FROM OLD."Class Cost"
      OR NEW."Tutor Cost" IS DISTINCT FROM OLD."Tutor Cost"
      OR NEW."Student Payment" IS DISTINCT FROM OLD."Student Payment"
      OR NEW."Tutor Payment" IS DISTINCT FROM OLD."Tutor Payment"
      OR NEW.student_user_id IS DISTINCT FROM OLD.student_user_id
      OR NEW.tutor_user_id IS DISTINCT FROM OLD.tutor_user_id
      OR NEW.student_rating IS DISTINCT FROM OLD.student_rating
      OR NEW.student_feedback IS DISTINCT FROM OLD.student_feedback
    THEN
      RAISE EXCEPTION 'Tutors may only edit the Content and HW fields on a class log';
    END IF;
    RETURN NEW;
  END IF;

  IF v_role = 'student' THEN
    IF NEW."Content" IS DISTINCT FROM OLD."Content"
      OR NEW."HW" IS DISTINCT FROM OLD."HW"
      OR NEW."Date" IS DISTINCT FROM OLD."Date"
      OR NEW."Day" IS DISTINCT FROM OLD."Day"
      OR NEW."Time (CST)" IS DISTINCT FROM OLD."Time (CST)"
      OR NEW."Time (hrs)" IS DISTINCT FROM OLD."Time (hrs)"
      OR NEW."Student Name" IS DISTINCT FROM OLD."Student Name"
      OR NEW."Tutor Name" IS DISTINCT FROM OLD."Tutor Name"
      OR NEW."Class Cost" IS DISTINCT FROM OLD."Class Cost"
      OR NEW."Tutor Cost" IS DISTINCT FROM OLD."Tutor Cost"
      OR NEW."Student Payment" IS DISTINCT FROM OLD."Student Payment"
      OR NEW."Tutor Payment" IS DISTINCT FROM OLD."Tutor Payment"
      OR NEW.student_user_id IS DISTINCT FROM OLD.student_user_id
      OR NEW.tutor_user_id IS DISTINCT FROM OLD.tutor_user_id
    THEN
      RAISE EXCEPTION 'Students may only edit their rating and feedback on a class log';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to update class logs directly';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_class_logs_update_columns ON public.class_logs;
CREATE TRIGGER trg_enforce_class_logs_update_columns
BEFORE UPDATE ON public.class_logs
FOR EACH ROW EXECUTE FUNCTION public.enforce_class_logs_update_columns();
