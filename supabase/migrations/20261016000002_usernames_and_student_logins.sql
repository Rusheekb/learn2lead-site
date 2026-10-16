-- Usernames for everyone, and logins for students a parent adds.
-- See docs/family-accounts-plan.md ("How everyone signs in", Phase B).
--
-- Every profile gets a unique username (case-insensitive). Existing accounts
-- get one generated from their name; email sign-in keeps working, so nobody
-- has to change anything. Students a parent adds sign in with a username and
-- a password their parent sets (they choose their own at first sign-in);
-- their internal sign-in address stays the never-emailed placeholder.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.username IS
  'Unique sign-in name (lowercase). Works anywhere an email does on the login page.';
COMMENT ON COLUMN public.profiles.must_change_password IS
  'Set when a parent sets or resets a student''s password; the student must choose their own at next sign-in.';

-- ─── Rules ──────────────────────────────────────────────────────────────────

-- Why a username can't be used, or NULL if it's fine (format and reserved
-- words; availability is checked separately).
CREATE OR REPLACE FUNCTION public.username_problem(p_username text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN lower(btrim(coalesce(p_username, ''))) !~ '^[a-z0-9][a-z0-9._]{2,29}$' THEN 'invalid'
    WHEN lower(btrim(p_username)) ~ '[._]{2}' OR lower(btrim(p_username)) ~ '[._]$' THEN 'invalid'
    WHEN lower(btrim(p_username)) IN (
      'admin', 'administrator', 'support', 'help', 'learn2lead', 'root',
      'system', 'tutor', 'tutors', 'parent', 'parents', 'student', 'students',
      'staff', 'moderator', 'billing', 'security', 'null', 'undefined'
    ) THEN 'reserved'
  END;
$function$;

-- A free username built from a name (or the email's local part), with a
-- number added when needed: maya.lee, maya.lee2, ...
CREATE OR REPLACE FUNCTION public.generate_username(p_first text, p_last text, p_email text)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_base text;
  v_candidate text;
  v_n int := 1;
BEGIN
  v_base := lower(concat_ws('.', nullif(btrim(p_first), ''), nullif(btrim(p_last), '')));
  v_base := regexp_replace(v_base, '[^a-z0-9.]+', '', 'g');
  v_base := regexp_replace(v_base, '\.{2,}', '.', 'g');
  v_base := btrim(v_base, '.');
  IF length(v_base) < 3 THEN
    v_base := regexp_replace(lower(split_part(coalesce(p_email, ''), '@', 1)), '[^a-z0-9.]+', '', 'g');
    v_base := btrim(regexp_replace(v_base, '\.{2,}', '.', 'g'), '.');
  END IF;
  IF length(v_base) < 3 THEN
    v_base := 'user';
  END IF;
  v_base := btrim(left(v_base, 24), '.');
  IF v_base !~ '^[a-z0-9]' THEN
    v_base := 'u' || v_base;
  END IF;

  v_candidate := v_base;
  WHILE public.username_problem(v_candidate) IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.profiles WHERE username = v_candidate)
  LOOP
    v_n := v_n + 1;
    v_candidate := v_base || v_n;
  END LOOP;
  RETURN v_candidate;
END;
$function$;

-- Every insert or username change: lowercase, validate, or generate one.
CREATE OR REPLACE FUNCTION public.profiles_username_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_problem text;
BEGIN
  IF NEW.username IS NULL OR btrim(NEW.username) = '' THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.username := OLD.username;  -- a username can be changed, not removed
    ELSE
      NEW.username := public.generate_username(NEW.first_name, NEW.last_name, NEW.email);
    END IF;
    RETURN NEW;
  END IF;

  NEW.username := lower(btrim(NEW.username));
  IF TG_OP = 'UPDATE' AND NEW.username = OLD.username THEN
    RETURN NEW;
  END IF;
  v_problem := public.username_problem(NEW.username);
  IF v_problem IS NOT NULL THEN
    RAISE EXCEPTION 'username_%', v_problem USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

-- ─── Backfill existing accounts, then lock it in ───────────────────────────
-- One row at a time (oldest first) so each name sees the ones before it.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id, first_name, last_name, email FROM public.profiles
           WHERE username IS NULL ORDER BY created_at, id
  LOOP
    UPDATE public.profiles
    SET username = public.generate_username(r.first_name, r.last_name, r.email)
    WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX profiles_username_key ON public.profiles (username);
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format CHECK (username = lower(username) AND username_problem(username) IS NULL);

CREATE TRIGGER trg_profiles_username_guard
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_username_guard();

-- A student editing their own profile can't change what their parent
-- controls: being managed, the hours-visibility switch, or (for a student
-- the parent added) their username and contact email. Parents change these
-- through their own functions (different caller), admins and the server
-- (no caller) are unaffected.
CREATE OR REPLACE FUNCTION public.profiles_parent_controls_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM NEW.id
     OR get_auth_user_role() = 'admin' THEN
    RETURN NEW;
  END IF;
  IF NEW.managed IS DISTINCT FROM OLD.managed
     OR NEW.hide_hours_from_student IS DISTINCT FROM OLD.hide_hours_from_student
     OR (OLD.managed AND NEW.username IS DISTINCT FROM OLD.username)
     OR (OLD.managed AND NEW.notification_email IS DISTINCT FROM OLD.notification_email)
  THEN
    RAISE EXCEPTION 'managed_by_parent' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_profiles_parent_controls_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_parent_controls_guard();

-- ─── Signup: take the chosen username if it's valid and free ───────────────
-- Same as 20261015000002 plus the username; otherwise one is generated (the
-- sign-up form checks availability first, so that's only a race fallback).
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text := trim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  ));
  v_space_pos int := 0;
  v_first_name text;
  v_last_name text;
  v_role app_role := CASE
    WHEN new.raw_user_meta_data ->> 'account_type' = 'parent' THEN 'parent'::app_role
    ELSE 'student'::app_role
  END;
  v_username text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
BEGIN
  v_space_pos := position(' ' in v_full_name);

  -- first_name always resolves to something non-blank - falls all the way
  -- back to the email's local part only if literally no name data exists
  -- anywhere, so a future NOT-blank constraint can never block a real signup.
  v_first_name := trim(coalesce(
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'given_name', ''),
    nullif(
      CASE WHEN v_space_pos > 0 THEN substring(v_full_name from 1 for v_space_pos - 1)
           ELSE v_full_name END,
      ''
    ),
    split_part(new.email, '@', 1)
  ));

  v_last_name := trim(coalesce(
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'family_name', ''),
    nullif(
      CASE WHEN v_space_pos > 0 THEN substring(v_full_name from v_space_pos + 1)
           ELSE '' END,
      ''
    ),
    ''
  ));

  IF v_username = ''
     OR public.username_problem(v_username) IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username)
  THEN
    v_username := NULL;  -- profiles_username_guard generates one
  END IF;

  INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      role,
      username,
      created_at,
      updated_at
  )
  VALUES (
      new.id,
      new.email,
      v_first_name,
      v_last_name,
      v_role, -- student unless the signup chose a family account; admin promotes tutors manually
      v_username,
      now(),
      now()
  );

  RETURN new;
END;
$function$;

-- ─── Functions for the app ──────────────────────────────────────────────────

-- Live "is it taken?" check on the sign-up form (and settings). Answers only
-- yes/no plus why; never who has it.
CREATE OR REPLACE FUNCTION public.check_username(p_username text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.username_problem(p_username) IS NOT NULL
      THEN jsonb_build_object('available', false, 'reason', public.username_problem(p_username))
    WHEN EXISTS (
      SELECT 1 FROM public.profiles
      WHERE username = lower(btrim(p_username))
        AND id IS DISTINCT FROM auth.uid()
    ) THEN jsonb_build_object('available', false, 'reason', 'taken')
    ELSE jsonb_build_object('available', true)
  END;
$function$;

CREATE OR REPLACE FUNCTION public.set_my_username(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_check jsonb := public.check_username(p_username);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF (SELECT managed FROM public.profiles WHERE id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'managed_by_parent');
  END IF;
  IF NOT (v_check ->> 'available')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_check ->> 'reason');
  END IF;
  UPDATE public.profiles SET username = lower(btrim(p_username)), updated_at = now()
  WHERE id = auth.uid();
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'taken');
END;
$function$;

-- The student finished the "choose your own password" step.
CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.profiles SET must_change_password = false, updated_at = now()
  WHERE id = auth.uid();
$function$;

-- What a parent sees about a child's sign-in.
CREATE OR REPLACE FUNCTION public.get_student_login_status(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.is_guardian_of(p_student_id) AND get_auth_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT jsonb_build_object(
    'username', p.username,
    'managed', p.managed,
    'has_password', coalesce(u.encrypted_password, '') <> '',
    'disabled', coalesce(u.banned_until > now(), false),
    'must_change_password', p.must_change_password,
    'last_sign_in_at', u.last_sign_in_at
  ) INTO v
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = p_student_id;
  RETURN v;
END;
$function$;

-- Used by the username-login function (service role) to find who's signing in.
CREATE OR REPLACE FUNCTION public.login_email_for_username(p_username text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT email FROM public.profiles WHERE username = lower(btrim(coalesce(p_username, '')));
$function$;

-- The parent's student list gains the username (return type changes).
DROP FUNCTION public.get_my_children();
CREATE FUNCTION public.get_my_children()
RETURNS TABLE(
  student_id uuid,
  first_name text,
  last_name text,
  grade text,
  notification_email text,
  timezone text,
  managed boolean,
  linked_at timestamptz,
  hours_visible boolean,
  username text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.first_name, p.last_name, s.grade,
         CASE WHEN p.managed THEN p.notification_email ELSE p.email END,
         p.timezone, p.managed, gl.created_at, NOT p.hide_hours_from_student, p.username
  FROM public.guardian_links gl
  JOIN public.profiles p ON p.id = gl.student_id
  LEFT JOIN public.students s ON lower(s.email) = lower(p.email)
  WHERE gl.guardian_id = auth.uid()
  ORDER BY gl.created_at, p.first_name;
$function$;

-- ─── Audit trail of what parents do to student accounts ────────────────────
CREATE TABLE public.account_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_audit_log_subject_idx ON public.account_audit_log (subject_id, created_at DESC);
ALTER TABLE public.account_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view the account audit log" ON public.account_audit_log
  FOR SELECT USING (get_auth_user_role() = 'admin');
REVOKE ALL ON public.account_audit_log FROM anon, authenticated;
GRANT SELECT ON public.account_audit_log TO authenticated;
GRANT ALL ON public.account_audit_log TO service_role;

-- The hours switch is logged too (same function as 20261016000001 plus the log).
CREATE OR REPLACE FUNCTION public.set_student_hours_visibility(p_student_id uuid, p_visible boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_guardian_of(p_student_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_your_child');
  END IF;
  UPDATE public.profiles
  SET hide_hours_from_student = NOT COALESCE(p_visible, true), updated_at = now()
  WHERE id = p_student_id;
  INSERT INTO public.account_audit_log (actor_id, subject_id, action, details)
  VALUES (auth.uid(), p_student_id, 'hours_visibility', jsonb_build_object('visible', COALESCE(p_visible, true)));
  RETURN jsonb_build_object('success', true);
END;
$function$;

-- ─── Grants ─────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.generate_username(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.login_email_for_username(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_email_for_username(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_username(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.username_problem(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_username(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_my_username(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_username(text) TO authenticated;
REVOKE ALL ON FUNCTION public.clear_must_change_password() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;
REVOKE ALL ON FUNCTION public.get_student_login_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_login_status(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_children() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_children() TO authenticated;
