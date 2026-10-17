-- Messaging (docs/family-accounts-plan.md, Phase D).
--
-- One conversation per student + tutor pair. Who can read it: the student,
-- the tutor, the student's parent(s) and Learn2Lead admins — so a tutor never
-- has a private channel with a minor (safeguarding rule D13). Who can write:
-- the same people, while the tutor is actively assigned (admins always).
-- Messages are immutable (no edit or delete) so there's a reliable record.
-- Posting goes through post_message(); notifications through the
-- send-message function and the notification dispatcher.

CREATE TABLE public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  UNIQUE (student_id, tutor_id)
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_thread_created_idx ON public.messages (thread_id, created_at);

-- Per person, per conversation: what they've read and when we last alerted
-- them (for the notification cooldown).
CREATE TABLE public.message_reads (
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  last_notified_at timestamptz,
  PRIMARY KEY (thread_id, profile_id)
);

-- ─── Access ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_view_thread(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id = p_thread_id
      AND (
        auth.uid() IN (t.student_id, t.tutor_id)
        OR public.is_guardian_of(t.student_id)
        OR get_auth_user_role() = 'admin'
      )
  );
$function$;

-- Whether the caller may start or continue a conversation for this pair.
CREATE OR REPLACE FUNCTION public.can_message_pair(p_student_id uuid, p_tutor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    get_auth_user_role() = 'admin'
    OR (
      EXISTS (
        SELECT 1 FROM public.tutor_student_assigned
        WHERE student_id = p_student_id AND tutor_id = p_tutor_id AND active = true
      )
      AND (
        auth.uid() IN (p_student_id, p_tutor_id)
        OR public.is_guardian_of(p_student_id)
      )
    );
$function$;

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their conversations" ON public.message_threads
  FOR SELECT USING (public.can_view_thread(id));
CREATE POLICY "Participants can read messages" ON public.messages
  FOR SELECT USING (public.can_view_thread(thread_id));
CREATE POLICY "People can see their own read markers" ON public.message_reads
  FOR SELECT USING (profile_id = auth.uid());

-- All writes go through the functions below; messages can't be edited or deleted.
REVOKE ALL ON public.message_threads, public.messages, public.message_reads FROM anon, authenticated;
GRANT SELECT ON public.message_threads, public.messages, public.message_reads TO authenticated;
GRANT ALL ON public.message_threads, public.messages, public.message_reads TO service_role;

-- ─── Functions for the app ──────────────────────────────────────────────────

-- Display name and the role a person plays in a conversation.
CREATE OR REPLACE FUNCTION public.thread_role(p_thread_id uuid, p_profile_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_profile_id = t.tutor_id THEN 'tutor'
    WHEN p_profile_id = t.student_id THEN 'student'
    WHEN EXISTS (SELECT 1 FROM public.guardian_links gl
                 WHERE gl.student_id = t.student_id AND gl.guardian_id = p_profile_id) THEN 'parent'
    WHEN (SELECT role FROM public.profiles WHERE id = p_profile_id) = 'admin' THEN 'staff'
    ELSE 'former'
  END
  FROM public.message_threads t WHERE t.id = p_thread_id;
$function$;

-- Pairs the caller can start a conversation for.
CREATE OR REPLACE FUNCTION public.get_messageable_pairs()
RETURNS TABLE(student_id uuid, student_name text, tutor_id uuid, tutor_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT tsa.student_id,
         TRIM(CONCAT(sp.first_name, ' ', sp.last_name)),
         tsa.tutor_id,
         TRIM(CONCAT(tp.first_name, ' ', tp.last_name))
  FROM public.tutor_student_assigned tsa
  JOIN public.profiles sp ON sp.id = tsa.student_id
  JOIN public.profiles tp ON tp.id = tsa.tutor_id
  WHERE tsa.active = true
    AND public.can_message_pair(tsa.student_id, tsa.tutor_id)
  ORDER BY 2, 4;
$function$;

-- The caller's conversations, newest first, with unread counts.
CREATE OR REPLACE FUNCTION public.get_my_threads()
RETURNS TABLE(
  thread_id uuid,
  student_id uuid,
  student_name text,
  tutor_id uuid,
  tutor_name text,
  last_message_at timestamptz,
  last_message_preview text,
  last_sender_name text,
  unread_count bigint,
  can_post boolean,
  my_role text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT t.id, t.student_id,
         TRIM(CONCAT(sp.first_name, ' ', sp.last_name)),
         t.tutor_id,
         TRIM(CONCAT(tp.first_name, ' ', tp.last_name)),
         t.last_message_at,
         left(lm.body, 140),
         TRIM(CONCAT(lp.first_name, ' ', lp.last_name)),
         -- Admins can open every conversation, but only count unread in
         -- ones they've opened or written in.
         CASE WHEN get_auth_user_role() = 'admin' AND r.last_read_at IS NULL THEN 0::bigint
         ELSE (SELECT count(*) FROM public.messages m
               WHERE m.thread_id = t.id
                 AND m.sender_id IS DISTINCT FROM auth.uid()
                 AND m.created_at > COALESCE(r.last_read_at, '-infinity'))
         END,
         public.can_message_pair(t.student_id, t.tutor_id),
         public.thread_role(t.id, auth.uid())
  FROM public.message_threads t
  JOIN public.profiles sp ON sp.id = t.student_id
  JOIN public.profiles tp ON tp.id = t.tutor_id
  LEFT JOIN public.message_reads r ON r.thread_id = t.id AND r.profile_id = auth.uid()
  LEFT JOIN LATERAL (
    SELECT body, sender_id FROM public.messages
    WHERE thread_id = t.id ORDER BY created_at DESC, id DESC LIMIT 1
  ) lm ON true
  LEFT JOIN public.profiles lp ON lp.id = lm.sender_id
  WHERE public.can_view_thread(t.id)
  ORDER BY t.last_message_at DESC NULLS LAST, t.created_at DESC;
$function$;

-- Messages in a conversation, oldest first, with who sent each.
CREATE OR REPLACE FUNCTION public.get_thread_messages(p_thread_id uuid, p_limit integer DEFAULT 200)
RETURNS TABLE(
  id uuid,
  sender_id uuid,
  sender_name text,
  sender_role text,
  body text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_view_thread(p_thread_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT * FROM (
    SELECT m.id, m.sender_id,
           COALESCE(NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''), 'Former member'),
           public.thread_role(p_thread_id, m.sender_id),
           m.body, m.created_at
    FROM public.messages m
    LEFT JOIN public.profiles p ON p.id = m.sender_id
    WHERE m.thread_id = p_thread_id
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 500)
  ) recent
  ORDER BY recent.created_at, recent.id;
END;
$function$;

-- Who can read this conversation (shown to participants for transparency).
CREATE OR REPLACE FUNCTION public.get_thread_participants(p_thread_id uuid)
RETURNS TABLE(profile_id uuid, name text, role text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_view_thread(p_thread_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT p.id, TRIM(CONCAT(p.first_name, ' ', p.last_name)), public.thread_role(p_thread_id, p.id)
  FROM public.message_threads t
  JOIN public.profiles p ON p.id IN (
    t.student_id, t.tutor_id
  ) OR p.id IN (SELECT gl.guardian_id FROM public.guardian_links gl WHERE gl.student_id = t.student_id)
  WHERE t.id = p_thread_id;
END;
$function$;

-- Open (or create) the conversation for a pair.
CREATE OR REPLACE FUNCTION public.get_or_create_thread(p_student_id uuid, p_tutor_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.message_threads
  WHERE student_id = p_student_id AND tutor_id = p_tutor_id;
  IF v_id IS NOT NULL THEN
    IF NOT public.can_view_thread(v_id) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
    RETURN v_id;
  END IF;
  IF NOT public.can_message_pair(p_student_id, p_tutor_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.message_threads (student_id, tutor_id)
  VALUES (p_student_id, p_tutor_id)
  ON CONFLICT (student_id, tutor_id) DO UPDATE SET student_id = EXCLUDED.student_id
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

-- Post a message (as the caller). Returns the new message's id.
CREATE OR REPLACE FUNCTION public.post_message(p_thread_id uuid, p_body text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_thread public.message_threads;
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
BEGIN
  SELECT * INTO v_thread FROM public.message_threads WHERE id = p_thread_id;
  IF NOT FOUND OR NOT public.can_view_thread(p_thread_id)
     OR NOT public.can_message_pair(v_thread.student_id, v_thread.tutor_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF length(v_body) = 0 OR length(v_body) > 4000 THEN
    RAISE EXCEPTION 'Message must be 1 to 4000 characters';
  END IF;
  IF (SELECT count(*) FROM public.messages
      WHERE sender_id = auth.uid() AND created_at > now() - interval '1 minute') >= 20 THEN
    RAISE EXCEPTION 'You are sending messages too quickly. Please wait a moment.';
  END IF;

  INSERT INTO public.messages (thread_id, sender_id, body)
  VALUES (p_thread_id, auth.uid(), v_body)
  RETURNING id INTO v_id;

  UPDATE public.message_threads SET last_message_at = now() WHERE id = p_thread_id;
  INSERT INTO public.message_reads (thread_id, profile_id, last_read_at)
  VALUES (p_thread_id, auth.uid(), now())
  ON CONFLICT (thread_id, profile_id) DO UPDATE SET last_read_at = now();
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_thread_read(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_view_thread(p_thread_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.message_reads (thread_id, profile_id, last_read_at)
  VALUES (p_thread_id, auth.uid(), now())
  ON CONFLICT (thread_id, profile_id) DO UPDATE SET last_read_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_unread_message_count()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(sum(unread_count), 0)::bigint FROM public.get_my_threads();
$function$;

-- For the send-message function (service role): who to alert about a new
-- message — the student, tutor, parents, and any admin who has written in
-- the conversation, minus the sender — skipping anyone alerted in the last
-- 10 minutes who hasn't read since (one alert per burst). Records the alert.
CREATE OR REPLACE FUNCTION public.claim_message_alerts(p_message_id uuid)
RETURNS TABLE(profile_id uuid, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_msg public.messages;
  v_thread public.message_threads;
BEGIN
  SELECT * INTO v_msg FROM public.messages WHERE id = p_message_id;
  SELECT * INTO v_thread FROM public.message_threads WHERE id = v_msg.thread_id;

  RETURN QUERY
  WITH people AS (
    SELECT v_thread.tutor_id AS pid
    UNION SELECT v_thread.student_id
    UNION SELECT gl.guardian_id FROM public.guardian_links gl WHERE gl.student_id = v_thread.student_id
    UNION SELECT m.sender_id FROM public.messages m
          JOIN public.profiles ap ON ap.id = m.sender_id AND ap.role = 'admin'
          WHERE m.thread_id = v_thread.id
  ),
  eligible AS (
    SELECT p.pid
    FROM people p
    LEFT JOIN public.message_reads r ON r.thread_id = v_thread.id AND r.profile_id = p.pid
    WHERE p.pid IS DISTINCT FROM v_msg.sender_id
      AND (
        r.last_notified_at IS NULL
        OR r.last_notified_at < now() - interval '10 minutes'
        OR COALESCE(r.last_read_at, '-infinity') > r.last_notified_at
      )
  ),
  marked AS (
    INSERT INTO public.message_reads (thread_id, profile_id, last_notified_at)
    SELECT v_thread.id, e.pid, now() FROM eligible e
    ON CONFLICT ON CONSTRAINT message_reads_pkey DO UPDATE SET last_notified_at = now()
    RETURNING message_reads.profile_id
  )
  SELECT m.profile_id, public.thread_role(v_thread.id, m.profile_id) FROM marked m;
END;
$function$;

-- ─── Grants ─────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.can_view_thread(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_message_pair(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.thread_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_messageable_pairs() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_threads() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_thread_messages(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_thread_participants(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_or_create_thread(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.post_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_thread_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_unread_message_count() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_message_alerts(uuid) FROM PUBLIC, anon, authenticated;
-- can_view_thread is used by the table policies, so callers need it; the
-- other two are only used inside the functions here.
GRANT EXECUTE ON FUNCTION public.can_view_thread(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_message_pair(uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.thread_role(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.can_message_pair(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.thread_role(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_messageable_pairs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_threads() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_thread_messages(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_thread_participants(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_thread(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_thread_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_message_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_message_alerts(uuid) TO service_role;
