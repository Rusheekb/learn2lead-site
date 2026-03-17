
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
      'tutor_name', "Tutor Name",
      'unpaid_count', COUNT(*)::int,
      'total_owed', COALESCE(SUM("Tutor Cost"), 0),
      'class_ids', jsonb_agg(id)
    ) AS row_data,
    COALESCE(SUM("Tutor Cost"), 0) AS total_owed
    FROM public.class_logs
    WHERE tutor_payment_date IS NULL
      AND "Tutor Name" IS NOT NULL
    GROUP BY "Tutor Name"
  ) sub;

  RETURN result;
END;
$$;
