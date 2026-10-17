-- Student payment summary for admin bulk payment workflow.
-- Uses LEFT JOIN so students who have no entry in the `students` table (or whose
-- name differs slightly) still appear. Only confirmed Stripe students are excluded
-- (manual payment tracking is irrelevant for them).
CREATE OR REPLACE FUNCTION public.get_student_unpaid_summary()
RETURNS TABLE (
  student_name      TEXT,
  unpaid_count      BIGINT,
  total_owed        NUMERIC,
  class_ids         UUID[],
  last_payment_date DATE
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
    )                                          AS last_payment_date
  FROM class_logs cl
  -- Left join: include even if the student has no record in the students table
  LEFT JOIN students s
    ON  s.name = cl."Student Name"
  WHERE cl.student_payment_date IS NULL
    -- Exclude only students explicitly marked as Stripe payers
    AND COALESCE(s.payment_method, 'zelle') != 'stripe'
  GROUP BY cl."Student Name"
  HAVING COUNT(*) > 0
  ORDER BY total_owed DESC NULLS LAST;
END;
$$;
