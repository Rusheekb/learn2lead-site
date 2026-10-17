
-- Create a table to store backup logs
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT,
  size_bytes BIGINT,
  status TEXT NOT NULL,
  error_message TEXT,
  restored_from UUID REFERENCES public.backup_logs(id),
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('db-backups', 'Database Backups', false, 104857600, '{"application/json"}')
ON CONFLICT (id) DO NOTHING;

-- Set RLS policies for backup_logs table
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all backup logs
CREATE POLICY "Admins can read all backup logs" ON public.backup_logs
  FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Admins can insert backup logs
CREATE POLICY "Admins can insert backup logs" ON public.backup_logs
  FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Admins can update backup logs
CREATE POLICY "Admins can update backup logs" ON public.backup_logs
  FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Set up storage bucket RLS policies
-- Admins can read backup files
CREATE POLICY "Admins can read backup files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'db-backups' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admins can upload backup files
CREATE POLICY "Admins can upload backup files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'db-backups' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Scheduled daily backup job (runs at 3 AM)
-- First, enable the required extensions if they're not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the daily backup job
SELECT cron.schedule(
  'daily-database-backup',
  '0 3 * * *', -- Run every day at 3 AM
  $$
  SELECT net.http_post(
    url := 'https://lnhtlbatcufmsyoujuqh.functions.supabase.co/db-operations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || (
      SELECT setting FROM pg_settings WHERE name = 'supabase.anon_key'
    ) || '"}',
    body := '{"action": "create"}',
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);
