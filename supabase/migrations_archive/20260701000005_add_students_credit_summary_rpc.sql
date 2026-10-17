-- Replaces the per-class student_payment_date tracking with a credit-balance view.
-- Returns students whose credit balance is at or below the attention threshold (≤2),
-- so the admin card shows exactly who needs a top-up. Only students with an active
-- or trialing subscription are included (everyone who can take classes).
CREATE OR REPLACE FUNCTION public.get_students_credit_summary()
RETURNS TABLE (
  student_name    TEXT,
  profile_id      UUID,
  credits         NUMERIC,
  class_rate      NUMERIC,
  last_class_date DATE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Prefer students.name so the value matches the Add Credits dropdown exactly.
    COALESCE(
      s.name,
      NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), '')
    )                                  AS student_name,
    p.id                               AS profile_id,
    ss.credits_remaining::NUMERIC      AS credits,
    s.class_rate                       AS class_rate,
    (
      SELECT cl."Date"
      FROM   class_logs cl
      WHERE  cl.student_user_id = p.id
      ORDER  BY cl."Date" DESC
      LIMIT  1
    )                                  AS last_class_date
  FROM student_subscriptions ss
  JOIN  profiles p ON p.id = ss.student_id AND p.role = 'student'
  LEFT JOIN students s ON s.email = p.email
  WHERE ss.status IN ('active', 'trialing')
    AND ss.credits_remaining <= 2
  ORDER BY ss.credits_remaining ASC, p.last_name ASC;
END;
$$;
