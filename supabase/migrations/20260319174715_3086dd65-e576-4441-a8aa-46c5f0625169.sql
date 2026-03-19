-- Schedule 24h class reminders (daily at 8 AM CST = 14:00 UTC)
SELECT cron.schedule(
  'send-24h-class-reminders',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url:='https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/send-24h-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaHRsYmF0Y3VmbXN5b3VqdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTgyMTIsImV4cCI6MjA1OTg5NDIxMn0.6bxo3bNzkDWvyFMQPudYw5_3mVrxge-CfkChX2aDy9E"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

-- Schedule weekly digest (Mondays at 8 AM CST = 14:00 UTC)
SELECT cron.schedule(
  'send-weekly-student-digest',
  '0 14 * * 1',
  $$
  SELECT net.http_post(
    url:='https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/send-weekly-digest',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaHRsYmF0Y3VmbXN5b3VqdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTgyMTIsImV4cCI6MjA1OTg5NDIxMn0.6bxo3bNzkDWvyFMQPudYw5_3mVrxge-CfkChX2aDy9E"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);