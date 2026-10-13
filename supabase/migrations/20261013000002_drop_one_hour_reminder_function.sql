-- check_upcoming_classes() backed the "class starts in 1 hour" reminder
-- (send-class-reminders, triggered by cron-class-reminders). That reminder
-- was never scheduled and both edge functions were removed in
-- 20261013000001_cron_secret_auth.sql's rollout. Nothing else calls this
-- (no other function, trigger, or cron job references it), and the live
-- check-upcoming-classes edge function — similar name, unrelated — queries
-- scheduled_classes directly rather than using it.
--
-- scheduled_classes.reminder_sent (the flag it set) is left in place: it's
-- harmless, and dropping a column is a separate, larger change.

DROP FUNCTION IF EXISTS public.check_upcoming_classes();
