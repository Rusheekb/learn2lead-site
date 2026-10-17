-- Fix get_class_log_totals to use tutor_is_paid = FALSE as the canonical "unpaid" definition.
-- Previously used tutor_payment_date IS NULL, which disagrees with get_tutor_unpaid_summary()
-- (which uses tutor_is_paid = FALSE). This caused ClassTable header totals and TutorPaymentSummary
-- to show different unpaid amounts for the same dataset.

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
    'pending_tutor',   COALESCE(SUM(CASE WHEN tutor_is_paid = FALSE THEN "Tutor Cost" ELSE 0 END), 0),
    'total_count', COUNT(*)
  ) INTO result
  FROM public.class_logs
  WHERE
    (p_date IS NULL OR "Date" = p_date)
    AND (p_payment_filter IS NULL OR
      (p_payment_filter = 'student_unpaid' AND student_payment_date IS NULL) OR
      (p_payment_filter = 'student_paid'   AND student_payment_date IS NOT NULL) OR
      (p_payment_filter = 'tutor_unpaid'   AND tutor_is_paid = FALSE) OR
      (p_payment_filter = 'tutor_paid'     AND tutor_is_paid = TRUE)
    )
    AND (p_search IS NULL OR (
      "Class Number" ILIKE '%' || p_search || '%' OR
      "Tutor Name"   ILIKE '%' || p_search || '%' OR
      "Student Name" ILIKE '%' || p_search || '%' OR
      "Subject"      ILIKE '%' || p_search || '%' OR
      "Title"        ILIKE '%' || p_search || '%'
    ));

  RETURN result;
END;
$$;
