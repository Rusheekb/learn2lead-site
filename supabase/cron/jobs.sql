-- Scheduled jobs (pg_cron) — PRODUCTION ONLY. Reference copy, 2026-10-17.
--
-- Each job calls a production edge function with the shared secret from
-- Vault (`cron_secret`; the functions read the same value from the
-- CRON_SECRET edge secret — see supabase/functions/_shared/cronAuth.ts).
-- They're kept out of migrations so local and CI databases never call
-- production. To change a schedule, edit it here and run the statement on
-- production (cron.schedule replaces a job with the same name).

SELECT cron.schedule('quarterly-reports-generation', '0 9 1 1,4,7,10 *', $cron$
  SELECT net.http_post(
    url := 'https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/cron-quarterly-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := concat('{"time": "', now(), '"}')::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$);

SELECT cron.schedule('send-weekly-student-digest', '0 14 * * 1', $cron$
  SELECT net.http_post(
    url := 'https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/send-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$);

SELECT cron.schedule('admin-weekly-digest', '0 8 * * 1', $cron$
  SELECT net.http_post(
    url := 'https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/admin-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$);

SELECT cron.schedule('class-daily-reminder', '0 14 * * *', $cron$
  SELECT net.http_post(
    url := 'https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/class-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$);

