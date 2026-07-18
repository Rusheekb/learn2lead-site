-- Add class_rate to get_student_unpaid_summary so the admin card can warn when
-- a student's rate isn't configured before opening the payment recorder.
-- Also retains the LEFT JOIN approach (students without a students-table record
-- still appear) and keeps excluding confirmed Stripe payers.
-- Must DROP first because the RETURNS TABLE signature changed (added class_rate).
DROP FUNCTION IF EXISTS public.get_student_unpaid_summary();
CREATE OR REPLACE FUNCTION public.get_student_unpaid_summary()
RETURNS TABLE (
  student_name      TEXT,
  unpaid_count      BIGINT,
  total_owed        NUMERIC,
  class_ids         UUID[],
  last_payment_date DATE,
  class_rate        NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl."Student Name"                          AS student_name,
    COUNT(*)::BIGINT                           AS unpaid_count,
    COALESCE(SUM(cl."Class Cost"::NUMERIC), 0) AS total_owed,
    ARRAY_AGG(cl.id)                           AS class_ids,
    (
      SELECT cl2.student_payment_date
      FROM   class_logs cl2
      WHERE  cl2."Student Name" = cl."Student Name"
        AND  cl2.student_payment_date IS NOT NULL
      ORDER  BY cl2.student_payment_date DESC
      LIMIT  1
    )                                          AS last_payment_date,
    MIN(s.class_rate)                          AS class_rate
  FROM class_logs cl
  LEFT JOIN students s ON s.name = cl."Student Name"
  WHERE cl.student_payment_date IS NULL
    AND COALESCE(s.payment_method, 'zelle') != 'stripe'
  GROUP BY cl."Student Name"
  HAVING COUNT(*) > 0
  ORDER BY total_owed DESC NULLS LAST;
END;
$$;
