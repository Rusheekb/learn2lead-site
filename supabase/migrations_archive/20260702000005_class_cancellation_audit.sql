-- Capture an audit record whenever a scheduled class is hard-deleted.
-- Uses a BEFORE DELETE trigger so the row data is still accessible.
-- Admins can review this table for dispute resolution or absence patterns.

CREATE TABLE IF NOT EXISTS public.class_cancellations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_class_id UUID NOT NULL,
  title              TEXT,
  subject            TEXT,
  student_id         UUID,
  tutor_id           UUID,
  class_date         DATE,
  class_start        TIME,
  zoom_link          TEXT,
  notes              TEXT,
  cancelled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.class_cancellations ENABLE ROW LEVEL SECURITY;

-- Only admins can read cancellation records
CREATE POLICY "Admins can view class cancellations"
ON public.class_cancellations
FOR SELECT
TO public
USING (get_auth_user_role() = 'admin');

-- The trigger function runs as SECURITY DEFINER so it can always insert
CREATE OR REPLACE FUNCTION public.log_class_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.class_cancellations (
    scheduled_class_id,
    title,
    subject,
    student_id,
    tutor_id,
    class_date,
    class_start,
    zoom_link,
    notes,
    cancelled_by
  ) VALUES (
    OLD.id,
    OLD.title,
    OLD.subject,
    OLD.student_id,
    OLD.tutor_id,
    OLD.date,
    OLD.start_time,
    OLD.zoom_link,
    OLD.notes,
    auth.uid()
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_class_cancellation ON public.scheduled_classes;
CREATE TRIGGER trg_log_class_cancellation
  BEFORE DELETE ON public.scheduled_classes
  FOR EACH ROW
  EXECUTE FUNCTION public.log_class_cancellation();
