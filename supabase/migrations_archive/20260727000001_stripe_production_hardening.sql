-- ============================================================
-- Stripe production hardening
-- 1. stripe_webhook_events — audit log of every incoming event
-- 2. Referral usage idempotency — unique constraint on session
-- ============================================================

-- 1. Webhook event audit log
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT       NOT NULL UNIQUE,  -- Stripe evt_… ID (idempotency key)
  event_type     TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'received'
                             CHECK (status IN ('received', 'processed', 'failed', 'skipped')),
  error_message  TEXT,
  is_test_event  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admins can see all events for debugging; no other roles need access
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook events"
  ON public.stripe_webhook_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_stripe_webhook_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stripe_webhook_events_updated_at
  BEFORE UPDATE ON public.stripe_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.set_stripe_webhook_updated_at();

-- Index for quick admin lookups
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON public.stripe_webhook_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
  ON public.stripe_webhook_events (status, created_at DESC);

-- 2. Referral usage idempotency
-- subscription_id column stores the Stripe checkout session ID.
-- Prevents the same session from triggering double referral rewards on webhook retry.
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_usage_session_idempotency
  ON public.referral_usage (subscription_id)
  WHERE subscription_id IS NOT NULL;
