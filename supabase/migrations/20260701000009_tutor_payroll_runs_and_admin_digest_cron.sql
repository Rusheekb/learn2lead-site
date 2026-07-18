-- 1. Tutor payroll audit trail
CREATE TABLE IF NOT EXISTS public.tutor_payroll_runs (
  id          UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_name  TEXT             NOT NULL,
  paid_at     DATE             NOT NULL DEFAULT CURRENT_DATE,
  amount_paid NUMERIC(10, 2)  NOT NULL,
  class_count INTEGER          NOT NULL,
  class_ids   UUID[]           NOT NULL,
  created_at  TIMESTAMPTZ      DEFAULT now()
);

ALTER TABLE public.tutor_payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payroll runs"
ON public.tutor_payroll_runs FOR ALL TO public
USING (get_auth_user_role() = 'admin');

-- 2. Tutor ratings RPC (aggregate student_rating per tutor)
CREATE OR REPLACE FUNCTION public.get_tutor_ratings()
RETURNS TABLE (
  tutor_name   TEXT,
  avg_rating   NUMERIC,
  rating_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    "Tutor Name"                               AS tutor_name,
    ROUND(AVG(student_rating)::NUMERIC, 1)     AS avg_rating,
    COUNT(student_rating)                      AS rating_count
  FROM class_logs
  WHERE student_rating IS NOT NULL
    AND "Tutor Name" IS NOT NULL
  GROUP BY "Tutor Name"
  ORDER BY avg_rating DESC NULLS LAST;
$$;

-- 3. pg_cron: admin weekly digest every Monday at 8:00 UTC
SELECT cron.schedule(
  'admin-weekly-digest',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/admin-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.anon_key', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
