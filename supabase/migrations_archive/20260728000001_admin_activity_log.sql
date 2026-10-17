-- Admin activity log — immutable audit trail of all admin actions.
-- Inserted client-side by admin users; readable only by admins.

CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID        NOT NULL REFERENCES public.profiles(id),
  action_type  TEXT        NOT NULL,
  description  TEXT        NOT NULL,
  entity_type  TEXT,
  entity_id    TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity log"
  ON public.admin_activity_log FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert activity log"
  ON public.admin_activity_log FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created
  ON public.admin_activity_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin
  ON public.admin_activity_log (admin_id, created_at DESC);
