
-- Create aggregate RPC for class log totals (replaces full-table download)
CREATE OR REPLACE FUNCTION public.get_class_log_totals(
  p_search text DEFAULT NULL,
  p_date date DEFAULT NULL,
  p_payment_filter text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_class_cost', COALESCE(SUM("Class Cost"), 0),
    'total_tutor_cost', COALESCE(SUM("Tutor Cost"), 0),
    'pending_student', COALESCE(SUM(CASE WHEN student_payment_date IS NULL THEN "Class Cost" ELSE 0 END), 0),
    'pending_tutor', COALESCE(SUM(CASE WHEN tutor_payment_date IS NULL THEN "Tutor Cost" ELSE 0 END), 0),
    'total_count', COUNT(*)
  ) INTO result
  FROM public.class_logs
  WHERE
    (p_date IS NULL OR "Date" = p_date)
    AND (p_payment_filter IS NULL OR
      (p_payment_filter = 'student_unpaid' AND student_payment_date IS NULL) OR
      (p_payment_filter = 'student_paid' AND student_payment_date IS NOT NULL) OR
      (p_payment_filter = 'tutor_unpaid' AND tutor_payment_date IS NULL) OR
      (p_payment_filter = 'tutor_paid' AND tutor_payment_date IS NOT NULL)
    )
    AND (p_search IS NULL OR (
      "Class Number" ILIKE '%' || p_search || '%' OR
      "Tutor Name" ILIKE '%' || p_search || '%' OR
      "Student Name" ILIKE '%' || p_search || '%' OR
      "Subject" ILIKE '%' || p_search || '%' OR
      "Title" ILIKE '%' || p_search || '%'
    ));

  RETURN result;
END;
$$;
