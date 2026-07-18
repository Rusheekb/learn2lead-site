-- The old send-24h-class-reminders job and our new class-daily-reminder both
-- run at 14:00 UTC daily, but use different dedup columns (reminder_sent vs
-- reminder_24h_sent). Both would fire and send duplicate emails. Remove the
-- old job; class-daily-reminder → class-reminder is the canonical path.
SELECT cron.unschedule('send-24h-class-reminders');
