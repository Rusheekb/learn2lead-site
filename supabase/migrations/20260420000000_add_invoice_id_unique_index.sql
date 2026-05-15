-- Prevent duplicate credit allocations from simultaneous webhook deliveries.
-- A partial unique index (WHERE invoice_id IS NOT NULL) ensures only one ledger
-- entry can exist per Stripe session/invoice ID while allowing NULL for manual entries.
CREATE UNIQUE INDEX IF NOT EXISTS class_credits_ledger_invoice_id_unique
  ON class_credits_ledger (invoice_id)
  WHERE invoice_id IS NOT NULL;
