-- Remove class_cancellations rows that were actually completed classes.
--
-- complete_class_atomic deletes the scheduled class after logging it, and the
-- BEFORE DELETE trigger log_class_cancellation recorded every such delete as
-- a cancellation. That was fixed in 20261013000003_timezone_foundation.sql;
-- these are the historical rows it left behind (34 of 45 at the time of
-- writing, Aug 14 – Oct 13 2026), which showed under "Recent Cancellations"
-- on the admin Class Logs page. Each one has a matching class log by Class
-- ID, so it was a completion. Real cancellations (no matching log) are kept.
-- Approved by the owner on 2026-10-14.

DELETE FROM public.class_cancellations cc
WHERE EXISTS (
  SELECT 1 FROM public.class_logs cl
  WHERE cl."Class ID" = cc.scheduled_class_id::text
);
