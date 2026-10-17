-- Fixes a regression in tonight's class_logs_write_lockdown migration: the trigger
-- referenced "Student Payment"/"Tutor Payment" columns that no longer exist (they
-- were replaced by student_payment_date/tutor_payment_date/tutor_is_paid before
-- tonight, but the migration was written and metadata-verified without ever
-- exercising an actual UPDATE through the app). Every UPDATE that hit this trigger
-- has been failing with "record NEW has no field Student Payment" since it was
-- applied — this breaks the tutor's Content/HW edit and the student rating/feedback
-- flow, not just the new dispute feature that surfaced it.
--
-- Also closes a real gap found while fixing this: "Title", "verified_by_student",
-- and "verification_deadline" were never in either role's blocked-column list, so
-- they were silently writable by omission — the same mistake class as the payment
-- columns, just the opposite direction (open instead of crashing). Nothing
-- currently has a legitimate reason to write them from a tutor/student session, so
-- they're added to the blocklist for both roles now.
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
      OR NEW."Title" IS DISTINCT FROM OLD."Title"
      OR NEW."Additional Info" IS DISTINCT FROM OLD."Additional Info"
      OR NEW."Class ID" IS DISTINCT FROM OLD."Class ID"
      OR NEW."Class Number" IS DISTINCT FROM OLD."Class Number"
      OR NEW."Class Cost" IS DISTINCT FROM OLD."Class Cost"
      OR NEW."Tutor Cost" IS DISTINCT FROM OLD."Tutor Cost"
      OR NEW.student_payment_date IS DISTINCT FROM OLD.student_payment_date
      OR NEW.tutor_payment_date IS DISTINCT FROM OLD.tutor_payment_date
      OR NEW.tutor_is_paid IS DISTINCT FROM OLD.tutor_is_paid
      OR NEW.student_user_id IS DISTINCT FROM OLD.student_user_id
      OR NEW.tutor_user_id IS DISTINCT FROM OLD.tutor_user_id
      OR NEW.student_rating IS DISTINCT FROM OLD.student_rating
      OR NEW.student_feedback IS DISTINCT FROM OLD.student_feedback
      OR NEW.verified_by_student IS DISTINCT FROM OLD.verified_by_student
      OR NEW.verification_deadline IS DISTINCT FROM OLD.verification_deadline
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
      OR NEW."Title" IS DISTINCT FROM OLD."Title"
      OR NEW."Class Cost" IS DISTINCT FROM OLD."Class Cost"
      OR NEW."Tutor Cost" IS DISTINCT FROM OLD."Tutor Cost"
      OR NEW.student_payment_date IS DISTINCT FROM OLD.student_payment_date
      OR NEW.tutor_payment_date IS DISTINCT FROM OLD.tutor_payment_date
      OR NEW.tutor_is_paid IS DISTINCT FROM OLD.tutor_is_paid
      OR NEW.student_user_id IS DISTINCT FROM OLD.student_user_id
      OR NEW.tutor_user_id IS DISTINCT FROM OLD.tutor_user_id
      OR NEW.verified_by_student IS DISTINCT FROM OLD.verified_by_student
      OR NEW.verification_deadline IS DISTINCT FROM OLD.verification_deadline
    THEN
      RAISE EXCEPTION 'Students may only edit their rating, feedback, and dispute report on a class log';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to update class logs directly';
END;
$$;
