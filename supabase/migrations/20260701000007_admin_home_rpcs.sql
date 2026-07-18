-- Admin home dashboard RPCs
-- get_zero_credit_upcoming_students: students with 0 credits who still have upcoming sessions
-- get_at_risk_students: active subscribers with no class in the past 30 days

CREATE OR REPLACE FUNCTION public.get_zero_credit_upcoming_students()
RETURNS TABLE (
  student_name     TEXT,
  profile_id       UUID,
  email            TEXT,
  credits_remaining NUMERIC,
  next_class_date  DATE,
  next_class_title TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(
      NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), ''),
      p.email
    ) AS student_name,
    p.id    AS profile_id,
    p.email,
    ss.credits_remaining::NUMERIC,
    sc.date::DATE          AS next_class_date,
    sc.title               AS next_class_title
  FROM student_subscriptions ss
  JOIN profiles p ON p.id = ss.student_id
  JOIN LATERAL (
    SELECT date, title
    FROM   scheduled_classes
    WHERE  student_id = ss.student_id
      AND  date >= CURRENT_DATE
    ORDER  BY date ASC, start_time ASC
    LIMIT  1
  ) sc ON TRUE
  WHERE ss.status IN ('active', 'trialing')
    AND ss.credits_remaining <= 0
  ORDER BY sc.date ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_at_risk_students()
RETURNS TABLE (
  student_name    TEXT,
  profile_id      UUID,
  email           TEXT,
  credits_remaining NUMERIC,
  last_class_date DATE,
  days_since_class INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(
      NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), ''),
      p.email
    ) AS student_name,
    p.id  AS profile_id,
    p.email,
    ss.credits_remaining::NUMERIC,
    MAX(cl."Date")::DATE AS last_class_date,
    COALESCE(
      (CURRENT_DATE - MAX(cl."Date")::DATE)::INTEGER,
      999
    )                    AS days_since_class
  FROM student_subscriptions ss
  JOIN profiles p ON p.id = ss.student_id
  LEFT JOIN class_logs cl ON cl.student_user_id = p.id
  WHERE ss.status IN ('active', 'trialing')
  GROUP BY p.id, p.first_name, p.last_name, p.email, ss.credits_remaining
  HAVING
    MAX(cl."Date")::DATE < CURRENT_DATE - INTERVAL '30 days'
    OR MAX(cl."Date") IS NULL
  ORDER BY last_class_date ASC NULLS FIRST;
END;
$$;
