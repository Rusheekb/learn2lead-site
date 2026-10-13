-- Calendar feed: private per-user tokens, and close an open schedule leak.
--
-- get_user_calendar_events(user_id) was SECURITY DEFINER and executable by
-- anon, with no auth check: anyone on the internet who had a user's id could
-- download that user's full class schedule — titles, tutor and student
-- names, notes, and Zoom links. get_ics_feed(feed_id) wrapped it. Neither is
-- used by the app (the Settings "calendar feed" URL pointed at a route that
-- never existed and just served the homepage). Both are dropped; the new
-- calendar-feed edge function replaces them.
--
-- Feed tokens move out of profiles: the profile read policies for tutors and
-- students return whole rows of assigned users, so profiles.calendar_feed_id
-- let a student read their tutor's token (and so their whole schedule). The
-- new table is readable only by its owner, and written only via the two
-- functions below.

DROP FUNCTION IF EXISTS public.get_ics_feed(uuid);
DROP FUNCTION IF EXISTS public.get_user_calendar_events(uuid);

CREATE TABLE public.calendar_feed_tokens (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token      uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);

ALTER TABLE public.calendar_feed_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own calendar feed token"
  ON public.calendar_feed_tokens FOR SELECT
  USING (auth.uid() = user_id);
-- No insert/update/delete policies: writes go through the functions below.

-- Returns the caller's feed token, creating it on first use.
CREATE OR REPLACE FUNCTION public.get_my_calendar_feed_token()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.calendar_feed_tokens (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT token INTO v_token
  FROM public.calendar_feed_tokens
  WHERE user_id = auth.uid();

  RETURN v_token;
END;
$function$;

-- Replaces the caller's token, so any previously shared link stops working.
CREATE OR REPLACE FUNCTION public.rotate_my_calendar_feed_token()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.calendar_feed_tokens (user_id, token, rotated_at)
  VALUES (auth.uid(), gen_random_uuid(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET token = gen_random_uuid(), rotated_at = now()
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_calendar_feed_token() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rotate_my_calendar_feed_token() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_calendar_feed_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_my_calendar_feed_token() TO authenticated;

-- Readable by assigned users through the profile policies, and unused.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS calendar_feed_id;
