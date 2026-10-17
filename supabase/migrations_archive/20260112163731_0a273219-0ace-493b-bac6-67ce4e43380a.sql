-- Add invoice_id column to class_credits_ledger for improved duplicate detection
-- This replaces the fragile ilike matching on the reason field with exact matching

ALTER TABLE public.class_credits_ledger 
ADD COLUMN IF NOT EXISTS invoice_id TEXT;

-- Add index for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_class_credits_ledger_invoice_id 
ON public.class_credits_ledger(invoice_id) 
WHERE invoice_id IS NOT NULL;

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.class_credits_ledger.invoice_id IS 'Stripe invoice ID for idempotent credit processing';