-- Add explicit paid flag to class_logs.
-- Using an explicit boolean avoids false-positive "unpaid" for historical records
-- that were paid in Google Sheets but imported without a payment date.
ALTER TABLE public.class_logs
  ADD COLUMN IF NOT EXISTS tutor_is_paid BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: all existing rows are considered paid (they were paid in Sheets).
-- New rows created after this migration start as FALSE (unpaid) by default.
UPDATE public.class_logs SET tutor_is_paid = TRUE;

-- Update the RPC to use tutor_is_paid as the unpaid filter and include last_payment_date.
CREATE OR REPLACE FUNCTION public.get_tutor_unpaid_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_data ORDER BY total_owed DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'tutor_name',        cl."Tutor Name",
      'unpaid_count',      COUNT(*)::int,
      'total_owed',        COALESCE(SUM(cl."Tutor Cost"), 0),
      'class_ids',         jsonb_agg(cl.id),
      'last_payment_date', (
        SELECT MAX(cl2.tutor_payment_date)
        FROM public.class_logs cl2
        WHERE cl2."Tutor Name" = cl."Tutor Name"
          AND cl2.tutor_is_paid = TRUE
          AND cl2.tutor_payment_date IS NOT NULL
      )
    ) AS row_data,
    COALESCE(SUM(cl."Tutor Cost"), 0) AS total_owed
    FROM public.class_logs cl
    WHERE cl.tutor_is_paid = FALSE
      AND cl."Tutor Name" IS NOT NULL
    GROUP BY cl."Tutor Name"
  ) sub;

  RETURN result;
END;
$$;
