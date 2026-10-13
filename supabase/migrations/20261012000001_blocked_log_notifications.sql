-- One row per scheduled class whose log attempt was blocked because the
-- student was out of hours, recording that the family (and admin) were
-- emailed about it. Tutors commonly retry a blocked log several times; the
-- primary key on class_id makes deduct-class-credit's insert-if-absent the
-- dedupe, so each class triggers that email at most once, even if two
-- attempts land concurrently.
--
-- No FK to scheduled_classes: those rows are deleted when a class is
-- completed, and this record should outlive that.

CREATE TABLE public.blocked_log_notifications (
  class_id   uuid PRIMARY KEY,
  student_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Written only by deduct-class-credit with the service role; no client
-- access at all.
ALTER TABLE public.blocked_log_notifications ENABLE ROW LEVEL SECURITY;
