-- Enriched student overview for the admin Students tab:
-- credits_remaining, last_class_date, next_class_date in one query.

CREATE OR REPLACE FUNCTION public.get_admin_student_overview()
RETURNS TABLE (
  student_id        TEXT,
  name              TEXT,
  email             TEXT,
  active            BOOLEAN,
  class_rate        NUMERIC,
  credits_remaining NUMERIC,
  last_class_date   DATE,
  next_class_date   DATE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id::TEXT                                       AS student_id,
    s.name,
    s.email,
    s.active,
    s.class_rate::NUMERIC,
    COALESCE(ss.credits_remaining, 0)::NUMERIC       AS credits_remaining,
    MAX(cl."Date")::DATE                             AS last_class_date,
    (
      SELECT sc.date::DATE
      FROM   profiles p2
      JOIN   scheduled_classes sc ON sc.student_id = p2.id
      WHERE  p2.email = s.email
        AND  sc.date >= CURRENT_DATE
      ORDER  BY sc.date ASC, sc.start_time ASC
      LIMIT  1
    )                                                AS next_class_date
  FROM students s
  LEFT JOIN profiles p          ON p.email = s.email
  LEFT JOIN student_subscriptions ss
    ON  ss.student_id = p.id
    AND ss.status IN ('active', 'trialing')
  LEFT JOIN class_logs cl
    ON  cl.student_user_id = p.id
  GROUP BY
    s.id, s.name, s.email, s.active, s.class_rate, ss.credits_remaining
  ORDER BY s.active DESC, s.name ASC;
END;
$$;
