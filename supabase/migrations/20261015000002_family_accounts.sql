-- Family accounts, step 2 of 2. See docs/family-accounts-plan.md.
--
-- One rule drives everything: a linked parent always pays. A parent is a
-- login (role 'parent') linked to students through guardian_links. Children
-- a parent adds are "managed" students: real student identities (auth user +
-- profile + students row) with no usable login and a placeholder address, so
-- every existing student code path — tutor assignment, scheduling, class
-- logs, completion, RLS, calendar feeds — works for them unchanged.
--
-- New code answers two questions:
--   billing_account_for(student)            whose balance pays for this student
--   student_notification_recipients(...)    who gets emails about this student
-- For every account without a guardian (all existing accounts) the answer to
-- both is "the student themself", exactly as before this migration.

-- ─── Columns ────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS managed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_email text;

COMMENT ON COLUMN public.profiles.managed IS
  'Student added by a parent: no login, placeholder auth email, billed and contacted through guardian_links.';
COMMENT ON COLUMN public.profiles.notification_email IS
  'Optional real address for a managed student''s own class emails (reminders, homework). Never used to log in.';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_notification_email_format
  CHECK (notification_email IS NULL OR notification_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- ─── guardian_links ─────────────────────────────────────────────────────────

CREATE TABLE public.guardian_links (
  guardian_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_via text NOT NULL CHECK (created_via IN ('parent_added', 'invite', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guardian_id, student_id),
  CHECK (guardian_id <> student_id)
);

COMMENT ON TABLE public.guardian_links IS
  'Parent <-> student links. A link means the parent pays for and sees that student. v1 allows one parent per student (enforced in the functions that create links, not the schema, so a second guardian needs no schema change).';

CREATE INDEX guardian_links_student_id_idx ON public.guardian_links (student_id);

ALTER TABLE public.guardian_links ENABLE ROW LEVEL SECURITY;

-- Links are only ever written by the SECURITY DEFINER functions below.
CREATE POLICY "Guardians can view their own links" ON public.guardian_links
  FOR SELECT USING (guardian_id = auth.uid());
CREATE POLICY "Students can view links to themselves" ON public.guardian_links
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins can manage guardian links" ON public.guardian_links
  FOR ALL USING (get_auth_user_role() = 'admin');

-- ─── guardian_invites ───────────────────────────────────────────────────────
-- A student with their own account invites a parent by email. Separate from
-- guardian_links because the parent may not have an account yet.

CREATE TABLE public.guardian_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(btrim(email)) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at timestamptz
);

CREATE UNIQUE INDEX guardian_invites_one_pending_per_student
  ON public.guardian_invites (student_id) WHERE status = 'pending';
CREATE INDEX guardian_invites_email_idx ON public.guardian_invites (email) WHERE status = 'pending';

ALTER TABLE public.guardian_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own invites" ON public.guardian_invites
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins can manage guardian invites" ON public.guardian_invites
  FOR ALL USING (get_auth_user_role() = 'admin');

-- ─── Core helpers ───────────────────────────────────────────────────────────

-- The student's parent (oldest link), or NULL. Deterministic if a second
-- guardian is ever added.
CREATE OR REPLACE FUNCTION public.guardian_of(p_student_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT guardian_id
  FROM public.guardian_links
  WHERE student_id = p_student_id
  ORDER BY created_at, guardian_id
  LIMIT 1;
$function$;

-- Whose subscription pays for this student's classes. Returns the student
-- themself whenever they have no parent — i.e. for every pre-existing account.
CREATE OR REPLACE FUNCTION public.billing_account_for(p_student_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(public.guardian_of(p_student_id), p_student_id);
$function$;

-- The caller's children. Used by RLS policies (SECURITY DEFINER so the
-- policies don't recurse through guardian_links' own RLS).
CREATE OR REPLACE FUNCTION public.my_child_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT student_id FROM public.guardian_links WHERE guardian_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.is_guardian_of(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.guardian_links
    WHERE guardian_id = auth.uid() AND student_id = p_student_id
  );
$function$;

-- Anything that ties an account to real student activity. Only an account
-- with none of it may turn itself into a family account.
CREATE OR REPLACE FUNCTION public.has_student_history(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (SELECT 1 FROM public.tutor_student_assigned WHERE student_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.scheduled_classes WHERE student_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.class_logs WHERE student_user_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.student_subscriptions WHERE student_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.class_credits_ledger WHERE student_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.guardian_links WHERE student_id = p_user_id);
$function$;

-- Who gets an email about a student.
--   'student'     class reminders, tutor assigned, class logged / homework
--   'parent_only' money and summaries: balance, low/zero hours, blocked logs,
--                 weekly digest, quarterly report
-- Parents get every category. The student gets 'student' emails at their own
-- real address; with no parent they also get everything else — exactly
-- today's behaviour. Notification preferences are returned, not applied, so
-- each sender keeps applying them the way it already does.
CREATE OR REPLACE FUNCTION public.student_notification_recipients(
  p_student_id uuid,
  p_category text
)
RETURNS TABLE(
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  timezone text,
  is_guardian boolean,
  notify_class_reminders boolean,
  notify_low_credits boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_category IS NULL OR p_category NOT IN ('student', 'parent_only') THEN
    RAISE EXCEPTION 'Unknown recipient category: %', p_category;
  END IF;

  RETURN QUERY
  SELECT g.id, g.email, g.first_name, g.last_name, g.timezone, true,
         COALESCE(g.notify_class_reminders, true), COALESCE(g.notify_low_credits, true)
  FROM public.guardian_links gl
  JOIN public.profiles g ON g.id = gl.guardian_id
  WHERE gl.student_id = p_student_id
  ORDER BY gl.created_at, gl.guardian_id;

  RETURN QUERY
  SELECT s.id,
         CASE WHEN s.managed THEN s.notification_email ELSE s.email END,
         s.first_name, s.last_name, s.timezone, false,
         COALESCE(s.notify_class_reminders, true), COALESCE(s.notify_low_credits, true)
  FROM public.profiles s
  WHERE s.id = p_student_id
    AND (CASE WHEN s.managed THEN s.notification_email ELSE s.email END) IS NOT NULL
    AND (
      p_category = 'student'
      OR NOT EXISTS (SELECT 1 FROM public.guardian_links WHERE student_id = p_student_id)
    );
END;
$function$;

-- ─── Signup: a family account chosen at signup ──────────────────────────────
-- Same as before, except account_type 'parent' in the signup metadata makes
-- the profile a parent. Safe to take from user-supplied metadata: a parent
-- role grants nothing until a child is linked. Never tutor/admin.

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

  INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      role,
      created_at,
      updated_at
  )
  VALUES (
      new.id,
      new.email,
      v_first_name,
      v_last_name,
      v_role, -- student unless the signup chose a family account; admin promotes tutors manually
      now(),
      now()
  );

  RETURN new;
END;
$function$;

-- ─── Role changes ───────────────────────────────────────────────────────────
-- Unchanged, plus: a non-admin can only ever move student -> parent, and only
-- on a brand-new account with no student history (Google sign-ups choosing
-- "My child" after the fact). Everything else involving 'parent' is admin or
-- system (service-role) only.

CREATE OR REPLACE FUNCTION public.validate_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
  initiating_user UUID;
BEGIN
  -- Get the current user role and ID
  SELECT get_auth_user_role() INTO current_user_role;
  SELECT auth.uid() INTO initiating_user;

  -- If no authenticated user, this is a system operation (allow it)
  IF initiating_user IS NULL THEN
    -- Log the role change with NULL changed_by for system operations
    INSERT INTO role_change_audit (
      user_id, old_role, new_role, changed_by, reason
    ) VALUES (
      NEW.id, OLD.role::TEXT, NEW.role::TEXT,
      NULL,  -- NULL for system operations
      'System role change'
    );
    RETURN NEW;
  END IF;

  -- Prevent users from changing their own role to admin unless they're already admin
  IF OLD.role != NEW.role AND NEW.role = 'admin' AND OLD.role != 'admin' THEN
    -- Log attempted privilege escalation
    INSERT INTO security_logs (event_type, user_id, details)
    VALUES (
      'privilege_escalation_attempt',
      auth.uid(),
      jsonb_build_object(
        'attempted_role', NEW.role,
        'current_role', OLD.role,
        'timestamp', now()
      )
    );

    RAISE EXCEPTION 'Admin role assignment requires manual approval';
  END IF;

  -- Allow admin to promote students to tutors
  IF OLD.role = 'student' AND NEW.role = 'tutor' AND current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can promote students to tutors';
  END IF;

  -- Allow admin to demote tutors to students
  IF OLD.role = 'tutor' AND NEW.role = 'student' AND current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can demote tutors to students';
  END IF;

  -- Family accounts
  IF OLD.role IS DISTINCT FROM NEW.role
     AND (NEW.role = 'parent' OR OLD.role = 'parent')
     AND current_user_role IS DISTINCT FROM 'admin'
     AND NOT (
       OLD.role = 'student' AND NEW.role = 'parent'
       AND NEW.id = initiating_user
       AND NOT public.has_student_history(NEW.id)
     )
  THEN
    RAISE EXCEPTION 'Only a brand-new account can switch to a family account';
  END IF;

  -- Log all role changes for audit with admin info
  INSERT INTO role_change_audit (
    user_id, old_role, new_role, changed_by, reason
  ) VALUES (
    NEW.id, OLD.role::TEXT, NEW.role::TEXT, initiating_user,
    CASE
      WHEN OLD.role = 'student' AND NEW.role = 'tutor' THEN 'Admin promotion to tutor'
      WHEN OLD.role = 'tutor' AND NEW.role = 'student' THEN 'Admin demotion to student'
      WHEN NEW.role = 'parent' THEN 'Family account'
      ELSE 'Role change'
    END
  );

  RETURN NEW;
END;
$function$;

-- Google sign-ups land as students (the provider can't carry our signup
-- choice); "My child" then calls this. Brand-new accounts only.
CREATE OR REPLACE FUNCTION public.become_family_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role::text, email INTO v_role, v_email
  FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF v_role = 'parent' THEN
    RETURN jsonb_build_object('success', true, 'already', true);
  END IF;

  IF v_role IS DISTINCT FROM 'student' OR public.has_student_history(v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_eligible');
  END IF;

  UPDATE public.profiles SET role = 'parent', updated_at = now() WHERE id = v_uid;
  -- auto_sync_user_role made a students row at signup; a parent isn't one.
  DELETE FROM public.students WHERE lower(email) = lower(v_email);

  RETURN jsonb_build_object('success', true, 'already', false);
END;
$function$;

-- ─── Parent adds a child (called by the create-managed-student function) ───
-- The edge function creates the child's auth user first (that needs the auth
-- admin API); the profile and students rows come from the signup triggers.
-- This finishes the job in one transaction.

CREATE OR REPLACE FUNCTION public.register_managed_student(
  p_guardian_id uuid,
  p_student_id uuid,
  p_grade text,
  p_notification_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_guardian public.profiles;
  v_student public.profiles;
  v_children int;
  v_email text := nullif(lower(btrim(coalesce(p_notification_email, ''))), '');
BEGIN
  SELECT * INTO v_guardian FROM public.profiles WHERE id = p_guardian_id FOR UPDATE;
  IF NOT FOUND OR v_guardian.role <> 'parent' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_a_parent');
  END IF;

  SELECT count(*) INTO v_children FROM public.guardian_links WHERE guardian_id = p_guardian_id;
  IF v_children >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_children');
  END IF;

  SELECT * INTO v_student FROM public.profiles WHERE id = p_student_id FOR UPDATE;
  IF NOT FOUND OR v_student.role <> 'student' OR public.has_student_history(p_student_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'student_not_eligible');
  END IF;

  UPDATE public.profiles
  SET managed = true,
      notification_email = v_email,
      timezone = COALESCE(timezone, v_guardian.timezone),
      updated_at = now()
  WHERE id = p_student_id;

  UPDATE public.students
  SET grade = COALESCE(nullif(btrim(coalesce(p_grade, '')), ''), grade)
  WHERE lower(email) = lower(v_student.email);

  INSERT INTO public.guardian_links (guardian_id, student_id, created_via)
  VALUES (p_guardian_id, p_student_id, 'parent_added');

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- ─── Parent-facing reads and edits ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_children()
RETURNS TABLE(
  student_id uuid,
  first_name text,
  last_name text,
  grade text,
  notification_email text,
  timezone text,
  managed boolean,
  linked_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id, p.first_name, p.last_name, s.grade,
         CASE WHEN p.managed THEN p.notification_email ELSE p.email END,
         p.timezone, p.managed, gl.created_at
  FROM public.guardian_links gl
  JOIN public.profiles p ON p.id = gl.student_id
  LEFT JOIN public.students s ON lower(s.email) = lower(p.email)
  WHERE gl.guardian_id = auth.uid()
  ORDER BY gl.created_at, p.first_name;
$function$;

-- Parents edit the children they added. A student who linked a parent from
-- their own account keeps control of their own details.
CREATE OR REPLACE FUNCTION public.update_my_child(
  p_student_id uuid,
  p_first_name text,
  p_last_name text,
  p_grade text,
  p_notification_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student public.profiles;
  v_first text := btrim(coalesce(p_first_name, ''));
  v_last text := btrim(coalesce(p_last_name, ''));
  v_email text := nullif(lower(btrim(coalesce(p_notification_email, ''))), '');
BEGIN
  IF NOT public.is_guardian_of(p_student_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_your_child');
  END IF;

  SELECT * INTO v_student FROM public.profiles WHERE id = p_student_id FOR UPDATE;
  IF NOT v_student.managed THEN
    RETURN jsonb_build_object('success', false, 'error', 'student_manages_own_details');
  END IF;
  IF v_first = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'first_name_required');
  END IF;
  IF v_email IS NOT NULL AND v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email');
  END IF;

  -- Name changes reach students.name through trg_sync_roster_name_from_profile.
  UPDATE public.profiles
  SET first_name = v_first,
      last_name = v_last,
      notification_email = v_email,
      updated_at = now()
  WHERE id = p_student_id;

  UPDATE public.students
  SET grade = nullif(btrim(coalesce(p_grade, '')), '')
  WHERE lower(email) = lower(v_student.email);

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- A child's own calendar link (for their device), created by their parent.
CREATE OR REPLACE FUNCTION public.get_child_calendar_feed_token(p_student_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token uuid;
BEGIN
  IF NOT public.is_guardian_of(p_student_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.calendar_feed_tokens (user_id)
  VALUES (p_student_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT token INTO v_token FROM public.calendar_feed_tokens WHERE user_id = p_student_id;
  RETURN v_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rotate_child_calendar_feed_token(p_student_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token uuid;
BEGIN
  IF NOT public.is_guardian_of(p_student_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.calendar_feed_tokens (user_id, token, rotated_at)
  VALUES (p_student_id, gen_random_uuid(), now())
  ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, rotated_at = now()
  RETURNING token INTO v_token;
  RETURN v_token;
END;
$function$;

-- The family's hours history: every entry on the caller's own balance,
-- including each child's classes, with whose class it was.
CREATE OR REPLACE FUNCTION public.get_family_hours_history(p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  transaction_type text,
  amount numeric,
  balance_after numeric,
  reason text,
  student_id uuid,
  student_first_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT l.id, l.created_at, l.transaction_type, l.amount, l.balance_after, l.reason,
         l.student_id, p.first_name
  FROM public.class_credits_ledger l
  JOIN public.student_subscriptions ss ON ss.id = l.subscription_id
  LEFT JOIN public.profiles p ON p.id = l.student_id
  WHERE ss.student_id = auth.uid()
  ORDER BY l.created_at DESC, l.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$function$;

-- Invites addressed to the caller's email, so a parent sees them on their
-- dashboard even without the emailed link.
CREATE OR REPLACE FUNCTION public.get_my_pending_guardian_invites()
RETURNS TABLE(
  token uuid,
  student_first_name text,
  student_last_name text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT gi.token, s.first_name, s.last_name, gi.created_at, gi.expires_at
  FROM public.guardian_invites gi
  JOIN public.profiles me ON me.id = auth.uid()
  JOIN public.profiles s ON s.id = gi.student_id
  WHERE gi.status = 'pending'
    AND gi.expires_at > now()
    AND gi.email = lower(me.email)
  ORDER BY gi.created_at;
$function$;

-- ─── Student-facing: "Invite a parent" ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_family_status()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'guardian', (
      SELECT jsonb_build_object('first_name', g.first_name, 'last_name', g.last_name, 'email', g.email)
      FROM public.profiles g
      WHERE g.id = public.guardian_of(auth.uid())
    ),
    'pending_invite', (
      SELECT jsonb_build_object('email', gi.email, 'created_at', gi.created_at, 'expires_at', gi.expires_at)
      FROM public.guardian_invites gi
      WHERE gi.student_id = auth.uid() AND gi.status = 'pending' AND gi.expires_at > now()
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.cancel_my_guardian_invite()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
BEGIN
  UPDATE public.guardian_invites
  SET status = 'cancelled'
  WHERE student_id = auth.uid() AND status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'cancelled', v_count);
END;
$function$;

-- Called by the invite-guardian function (which sends the email).
CREATE OR REPLACE FUNCTION public.create_guardian_invite(p_student_id uuid, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student public.profiles;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_existing public.profiles;
  v_token uuid;
  v_expires timestamptz;
BEGIN
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email');
  END IF;

  SELECT * INTO v_student FROM public.profiles WHERE id = p_student_id FOR UPDATE;
  IF NOT FOUND OR v_student.role <> 'student' OR v_student.managed THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_eligible');
  END IF;
  IF lower(v_student.email) = v_email THEN
    RETURN jsonb_build_object('success', false, 'error', 'own_email');
  END IF;
  IF EXISTS (SELECT 1 FROM public.guardian_links WHERE student_id = p_student_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_linked');
  END IF;

  -- Fail early on addresses that can never accept.
  SELECT * INTO v_existing FROM public.profiles WHERE lower(email) = v_email;
  IF FOUND AND (
    v_existing.role IN ('tutor', 'admin')
    OR (v_existing.role = 'student' AND public.has_student_history(v_existing.id))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'email_not_eligible');
  END IF;

  UPDATE public.guardian_invites
  SET status = 'cancelled'
  WHERE student_id = p_student_id AND status = 'pending';

  INSERT INTO public.guardian_invites (student_id, email)
  VALUES (p_student_id, v_email)
  RETURNING token, expires_at INTO v_token, v_expires;

  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'expires_at', v_expires,
    'student_first_name', v_student.first_name,
    'student_last_name', v_student.last_name
  );
END;
$function$;

-- The parent accepts: link, then hand billing over (called by the
-- accept-guardian-invite function, which also updates the Stripe customer's
-- email). One transaction: either everything happens or nothing does.
--   Student has hours, parent has none: the student's subscription row is
--   re-pointed to the parent — balance, Stripe customer (saved card) and
--   auto-renew move together; nothing is recharged, no hours are recomputed,
--   ledger history stays attached through subscription_id.
--   Both have hours: the student's hours move into the parent's balance as a
--   matching pair of ledger entries; the student's auto-renew switches off.
CREATE OR REPLACE FUNCTION public.accept_guardian_invite(p_token uuid, p_guardian_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.guardian_invites;
  v_guardian public.profiles;
  v_student public.profiles;
  v_student_sub public.student_subscriptions;
  v_guardian_sub public.student_subscriptions;
  v_moved_sub_id uuid;
  v_customer text;
  v_hours numeric := 0;
  v_result jsonb;
  v_student_name text;
  v_guardian_name text;
BEGIN
  SELECT * INTO v_invite FROM public.guardian_invites WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invite_not_found');
  END IF;
  IF v_invite.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invite_' || v_invite.status);
  END IF;
  IF v_invite.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'invite_expired');
  END IF;

  SELECT * INTO v_guardian FROM public.profiles WHERE id = p_guardian_id FOR UPDATE;
  IF NOT FOUND OR lower(v_guardian.email) <> v_invite.email THEN
    RETURN jsonb_build_object('success', false, 'error', 'email_mismatch');
  END IF;
  IF v_guardian.id = v_invite.student_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'email_mismatch');
  END IF;

  IF v_guardian.role = 'student' THEN
    IF public.has_student_history(v_guardian.id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'guardian_not_eligible');
    END IF;
    UPDATE public.profiles SET role = 'parent', updated_at = now() WHERE id = v_guardian.id;
    DELETE FROM public.students WHERE lower(email) = lower(v_guardian.email);
  ELSIF v_guardian.role <> 'parent' THEN
    RETURN jsonb_build_object('success', false, 'error', 'guardian_not_eligible');
  END IF;

  SELECT * INTO v_student FROM public.profiles WHERE id = v_invite.student_id FOR UPDATE;
  IF NOT FOUND OR v_student.role <> 'student' THEN
    RETURN jsonb_build_object('success', false, 'error', 'student_not_eligible');
  END IF;
  IF EXISTS (SELECT 1 FROM public.guardian_links WHERE student_id = v_student.id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_linked');
  END IF;

  INSERT INTO public.guardian_links (guardian_id, student_id, created_via)
  VALUES (v_guardian.id, v_student.id, 'invite');

  v_student_name := NULLIF(TRIM(CONCAT(v_student.first_name, ' ', v_student.last_name)), '');
  v_guardian_name := NULLIF(TRIM(CONCAT(v_guardian.first_name, ' ', v_guardian.last_name)), '');

  SELECT * INTO v_student_sub FROM public.student_subscriptions
  WHERE student_id = v_student.id AND status IN ('active', 'trialing')
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  SELECT * INTO v_guardian_sub FROM public.student_subscriptions
  WHERE student_id = v_guardian.id AND status IN ('active', 'trialing')
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF v_student_sub.id IS NOT NULL AND v_guardian_sub.id IS NULL THEN
    UPDATE public.student_subscriptions
    SET student_id = v_guardian.id, updated_at = now()
    WHERE id = v_student_sub.id;
    v_moved_sub_id := v_student_sub.id;
    v_customer := v_student_sub.stripe_customer_id;
    v_hours := v_student_sub.credits_remaining;

    IF EXISTS (SELECT 1 FROM public.auto_renewal_settings WHERE student_id = v_guardian.id) THEN
      UPDATE public.auto_renewal_settings SET enabled = false, updated_at = now()
      WHERE student_id = v_student.id;
    ELSE
      UPDATE public.auto_renewal_settings SET student_id = v_guardian.id, updated_at = now()
      WHERE student_id = v_student.id;
    END IF;

  ELSIF v_student_sub.id IS NOT NULL AND v_guardian_sub.id IS NOT NULL THEN
    v_hours := v_student_sub.credits_remaining;
    IF v_hours <> 0 THEN
      v_result := public.apply_credit_ledger_entry(
        v_student.id, v_student_sub.id, 'adjustment', -v_hours,
        'Hours moved to ' || COALESCE(v_guardian_name, 'parent') || '''s family balance',
        NULL, NULL, NULL, true
      );
      IF NOT (v_result ->> 'success')::boolean THEN
        RAISE EXCEPTION 'Could not move hours out: %', v_result;
      END IF;
      v_result := public.apply_credit_ledger_entry(
        v_student.id, v_guardian_sub.id, 'adjustment', v_hours,
        'Hours moved from ' || COALESCE(v_student_name, 'student') || '''s account',
        NULL, NULL, NULL, true
      );
      IF NOT (v_result ->> 'success')::boolean THEN
        RAISE EXCEPTION 'Could not move hours in: %', v_result;
      END IF;
    END IF;
    UPDATE public.student_subscriptions SET status = 'cancelled', updated_at = now()
    WHERE id = v_student_sub.id;
    UPDATE public.auto_renewal_settings SET enabled = false, updated_at = now()
    WHERE student_id = v_student.id;
  END IF;

  UPDATE public.guardian_invites
  SET status = 'accepted', accepted_by = v_guardian.id, accepted_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'student_id', v_student.id,
    'student_first_name', v_student.first_name,
    'guardian_id', v_guardian.id,
    'moved_subscription_id', v_moved_sub_id,
    'stripe_customer_id', v_customer,
    'merged', v_student_sub.id IS NOT NULL AND v_guardian_sub.id IS NOT NULL,
    'hours_moved', v_hours
  );
END;
$function$;

-- ─── Admin tools ────────────────────────────────────────────────────────────

-- Unlink a parent from a student who has their own login. The hours stay with
-- the parent who paid; the student starts a fresh balance of their own.
CREATE OR REPLACE FUNCTION public.admin_unlink_guardian(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_managed boolean;
  v_count int;
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT managed INTO v_managed FROM public.profiles WHERE id = p_student_id;
  IF v_managed THEN
    -- A managed child has no login and no contact of their own; unlinking
    -- would strand them.
    RETURN jsonb_build_object('success', false, 'error', 'managed_student');
  END IF;

  DELETE FROM public.guardian_links WHERE student_id = p_student_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'removed', v_count);
END;
$function$;

-- Fallback for an existing account whose email is really the parent's (the
-- parent signed up under their own name for their child). The login becomes
-- the parent and keeps its email, Stripe customer, balance and auto-renew;
-- a new managed child (created by admin-convert-to-family) takes over the
-- student records. p_dry_run = true only counts what would move.
-- Runs as the signed-in admin (not the service role): the class_logs guard
-- only lets admins re-point a log, and the role change is audited under them.
CREATE OR REPLACE FUNCTION public.convert_account_to_family(
  p_account_id uuid,
  p_child_id uuid,
  p_parent_first_name text,
  p_parent_last_name text,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_account public.profiles;
  v_child public.profiles;
  v_old_student public.students;
  v_counts jsonb;
  v_child_name text;
  v_parent_first text := btrim(coalesce(p_parent_first_name, ''));
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO v_account FROM public.profiles WHERE id = p_account_id FOR UPDATE;
  IF NOT FOUND OR v_account.role <> 'student' OR v_account.managed THEN
    RETURN jsonb_build_object('success', false, 'error', 'account_not_eligible');
  END IF;
  IF EXISTS (SELECT 1 FROM public.guardian_links WHERE student_id = p_account_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_linked');
  END IF;

  v_counts := jsonb_build_object(
    'tutor_assignments', (SELECT count(*) FROM public.tutor_student_assigned WHERE student_id = p_account_id),
    'scheduled_classes', (SELECT count(*) FROM public.scheduled_classes WHERE student_id = p_account_id),
    'past_unlogged_classes', (SELECT count(*) FROM public.scheduled_classes WHERE student_id = p_account_id AND end_at < now()),
    'class_logs', (SELECT count(*) FROM public.class_logs WHERE student_user_id = p_account_id),
    'tutor_notes', (SELECT count(*) FROM public.student_notes WHERE student_id = p_account_id),
    'shared_files', (SELECT count(*) FROM public.content_shares WHERE receiver_id = p_account_id OR sender_id = p_account_id),
    'hours_balance', (SELECT credits_remaining FROM public.student_subscriptions
                      WHERE student_id = p_account_id AND status IN ('active', 'trialing')
                      ORDER BY created_at DESC LIMIT 1)
  );

  IF p_dry_run THEN
    RETURN jsonb_build_object('success', true, 'dry_run', true, 'would_move', v_counts);
  END IF;

  IF v_parent_first = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'parent_first_name_required');
  END IF;

  SELECT * INTO v_child FROM public.profiles WHERE id = p_child_id FOR UPDATE;
  IF NOT FOUND OR v_child.role <> 'student' OR public.has_student_history(p_child_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'child_not_eligible');
  END IF;
  v_child_name := TRIM(CONCAT(v_child.first_name, ' ', v_child.last_name));

  -- Student records follow the child.
  UPDATE public.tutor_student_assigned SET student_id = p_child_id WHERE student_id = p_account_id;
  UPDATE public.scheduled_classes SET student_id = p_child_id WHERE student_id = p_account_id;
  UPDATE public.class_logs SET student_user_id = p_child_id, "Student Name" = v_child_name
  WHERE student_user_id = p_account_id;
  UPDATE public.class_cancellations SET student_id = p_child_id WHERE student_id = p_account_id;
  UPDATE public.student_notes SET student_id = p_child_id WHERE student_id = p_account_id;
  UPDATE public.monthly_reports_sent SET student_id = p_child_id WHERE student_id = p_account_id;
  UPDATE public.blocked_log_notifications SET student_id = p_child_id WHERE student_id = p_account_id;
  UPDATE public.content_shares SET receiver_id = p_child_id WHERE receiver_id = p_account_id;
  UPDATE public.content_shares SET sender_id = p_child_id WHERE sender_id = p_account_id;

  -- The child's students row inherits the account's student details.
  SELECT * INTO v_old_student FROM public.students WHERE lower(email) = lower(v_account.email);
  IF FOUND THEN
    UPDATE public.students SET
      grade = v_old_student.grade,
      subjects = v_old_student.subjects,
      enrollment_date = v_old_student.enrollment_date,
      active = v_old_student.active,
      learning_pace = v_old_student.learning_pace,
      teaching_style_pref = v_old_student.teaching_style_pref,
      session_structure_pref = v_old_student.session_structure_pref,
      primary_goal = v_old_student.primary_goal,
      availability_windows = v_old_student.availability_windows,
      communication_pref = v_old_student.communication_pref,
      payment_method = v_old_student.payment_method,
      prepaid_balance = v_old_student.prepaid_balance,
      prepaid_class_count = v_old_student.prepaid_class_count
    WHERE lower(email) = lower(v_child.email);
    DELETE FROM public.students WHERE id = v_old_student.id;
  END IF;

  UPDATE public.profiles
  SET managed = true, timezone = COALESCE(v_account.timezone, timezone), updated_at = now()
  WHERE id = p_child_id;

  -- The login becomes the parent. Billing (subscription, ledger, auto-renew),
  -- Stripe customer, calendar link and referral codes stay with it.
  UPDATE public.profiles
  SET role = 'parent',
      first_name = v_parent_first,
      last_name = btrim(coalesce(p_parent_last_name, '')),
      updated_at = now()
  WHERE id = p_account_id;

  INSERT INTO public.guardian_links (guardian_id, student_id, created_via)
  VALUES (p_account_id, p_child_id, 'admin');

  RETURN jsonb_build_object('success', true, 'dry_run', false, 'moved', v_counts);
END;
$function$;

-- ─── Existing functions, made family-aware ──────────────────────────────────

-- Keep a subscription's balance in sync after each ledger write. Matched by
-- subscription id alone: a child's class is recorded under the child
-- (student_id) but charged to the parent's subscription, which the old
-- "AND student_id = NEW.student_id" never matched. For every existing row the
-- two are the same account (verified live before this migration: zero
-- mismatches), so this changes nothing for them.
CREATE OR REPLACE FUNCTION public.sync_subscription_credits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the subscription record with the new balance from ledger
  UPDATE student_subscriptions
  SET credits_remaining = NEW.balance_after,
      updated_at = now()
  WHERE id = NEW.subscription_id;

  RETURN NEW;
END;
$function$;

-- Only change: the class is priced from (and later debited against) the
-- paying account's subscription — the parent's, for a linked student.
CREATE OR REPLACE FUNCTION public.complete_class_atomic(p_class_id uuid, p_class_number text, p_tutor_name text, p_student_name text, p_date date, p_day text, p_time_cst text, p_time_hrs text, p_subject text, p_content text, p_hw text, p_additional_info text, p_credits_charged numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing_log_count integer;
  actual_tutor_name text;
  actual_student_name text;
  v_student_user_id uuid;
  v_tutor_user_id uuid;
  v_class_cost numeric;
  v_tutor_cost numeric;
  v_subscription_id uuid;
  v_manual_rate numeric;
  v_manual_remaining numeric(6,2);
  v_duration numeric;
  class_exists boolean;
  v_start_at timestamptz;
  v_timezone text;
  v_date date;
  v_day text;
  v_time_cst text;
  v_caller_id uuid := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required',
      'code', 'NOT_AUTHENTICATED'
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_class_id::text));

  -- Check class_logs FIRST (by Class ID) so a completed-but-unacknowledged
  -- class correctly returns ALREADY_COMPLETED rather than CLASS_NOT_FOUND.
  SELECT COUNT(*) INTO existing_log_count
  FROM public.class_logs
  WHERE "Class ID" = p_class_id::text;

  IF existing_log_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Class already completed',
      'code', 'ALREADY_COMPLETED'
    );
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.scheduled_classes WHERE id = p_class_id
  ) INTO class_exists;

  IF NOT class_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Class no longer exists or has already been completed',
      'code', 'CLASS_NOT_FOUND'
    );
  END IF;

  -- Get actual names, user IDs, and tutor rate via UUID-based joins
  SELECT
    sc.tutor_id,
    sc.student_id,
    CASE
      WHEN TRIM(COALESCE(tp.first_name, '')) != '' OR TRIM(COALESCE(tp.last_name, '')) != '' THEN
        TRIM(CONCAT(COALESCE(tp.first_name, ''), ' ', COALESCE(tp.last_name, '')))
      ELSE COALESCE(tp.email, 'Unknown Tutor')
    END,
    CASE
      WHEN TRIM(COALESCE(sp.first_name, '')) != '' OR TRIM(COALESCE(sp.last_name, '')) != '' THEN
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, '')))
      ELSE COALESCE(sp.email, 'Unknown Student')
    END,
    t.hourly_rate,
    sc.start_at,
    sc.timezone
  INTO v_tutor_user_id, v_student_user_id, actual_tutor_name, actual_student_name, v_tutor_cost, v_start_at, v_timezone
  FROM public.scheduled_classes sc
  LEFT JOIN public.profiles tp ON sc.tutor_id = tp.id
  LEFT JOIN public.profiles sp ON sc.student_id = sp.id
  LEFT JOIN public.tutors t ON tp.email = t.email
  WHERE sc.id = p_class_id;

  -- Resolve the paying account's active subscription once (read-only — the
  -- actual manual-rate decrement happens later, only once we know the class
  -- will really be logged, so a rejected/duplicate request never burns a
  -- manually-priced class): a still-active one-off manual rate takes
  -- priority over the Stripe-plan-derived price; NULL when there's no active
  -- subscription or no plan and no manual rate, same as before. The paying
  -- account is the student's parent if they have one, else the student.
  SELECT ss.id, ss.manual_price_per_hour, ss.manual_priced_classes_remaining, plan.price_per_hour
  INTO v_subscription_id, v_manual_rate, v_manual_remaining, v_class_cost
  FROM public.student_subscriptions ss
  LEFT JOIN public.subscription_plans plan ON plan.id = ss.plan_id
  WHERE ss.student_id = public.billing_account_for(v_student_user_id)
    AND ss.status IN ('active', 'trialing')
  ORDER BY ss.created_at DESC
  LIMIT 1;

  IF v_manual_remaining IS NOT NULL AND v_manual_remaining > 0 THEN
    v_class_cost := v_manual_rate;
  END IF;

  -- price_per_hour / manual_price_per_hour / hourly_rate are all genuinely
  -- hourly rates — scale both cost figures by the class's actual duration.
  -- NULL * anything = NULL, so a student with no plan and no manual rate
  -- still correctly gets a NULL Class Cost rather than a fabricated number.
  v_duration := COALESCE(p_credits_charged, NULLIF(p_time_hrs, '')::numeric, 1);
  v_class_cost := v_class_cost * v_duration;
  v_tutor_cost := v_tutor_cost * v_duration;

  -- Only the class's own assigned tutor or an admin may complete it —
  -- without this, any authenticated account (or, before this migration,
  -- even an unauthenticated caller) could complete an arbitrary class by
  -- guessing/obtaining its UUID, consuming credits and deleting the
  -- schedule row with no ownership check at all.
  IF v_caller_id != v_tutor_user_id AND get_auth_user_role() != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized to complete this class',
      'code', 'PERMISSION_DENIED'
    );
  END IF;

  actual_tutor_name  := COALESCE(actual_tutor_name, p_tutor_name, 'Unknown Tutor');
  actual_student_name := COALESCE(actual_student_name, p_student_name, 'Unknown Student');

  -- Date / Day / "Time (CST)" always record the class's Central clock time,
  -- derived from its exact start (start_at) instead of trusting the client,
  -- whose screen may now show the class in a different time zone.
  v_date     := COALESCE((v_start_at AT TIME ZONE 'America/Chicago')::date, p_date);
  v_day      := COALESCE(to_char(v_start_at AT TIME ZONE 'America/Chicago', 'FMDay'), p_day);
  v_time_cst := COALESCE(to_char(v_start_at AT TIME ZONE 'America/Chicago', 'HH24:MI'), p_time_cst);

  -- Secondary duplicate guard: same tutor/student/date/time/subject
  SELECT COUNT(*) INTO existing_log_count
  FROM public.class_logs
  WHERE "Tutor Name"  = actual_tutor_name
    AND "Student Name" = actual_student_name
    AND "Date"         = v_date
    AND "Time (CST)"   = v_time_cst
    AND "Subject"      = p_subject;

  IF existing_log_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A class log already exists for this session',
      'code', 'DUPLICATE_SESSION'
    );
  END IF;

  BEGIN
    IF v_manual_remaining IS NOT NULL AND v_manual_remaining > 0 THEN
      UPDATE public.student_subscriptions
      -- Spend the one-off allowance by hours used, not by class: it's
      -- granted as hours (Adjust Hours), so a 1.5-hour class uses 1.5.
      SET manual_priced_classes_remaining =
        GREATEST(manual_priced_classes_remaining - v_duration, 0)
      WHERE id = v_subscription_id;
    END IF;

    INSERT INTO public.class_logs (
      "Class Number", "Tutor Name", "Student Name",
      "Date", "Day", "Time (CST)", "Time (hrs)",
      "Subject", "Content", "HW", "Class ID",
      "Additional Info", "Class Cost", "Tutor Cost",
      tutor_user_id, student_user_id,
      student_payment_date, start_at, timezone
    ) VALUES (
      p_class_number, actual_tutor_name, actual_student_name,
      v_date, v_day, v_time_cst, p_time_hrs,
      p_subject, p_content, p_hw, p_class_id::text,
      p_additional_info, v_class_cost, v_tutor_cost,
      v_tutor_user_id, v_student_user_id,
      CURRENT_DATE, v_start_at, COALESCE(v_timezone, 'America/Chicago')
    );

    -- Tell log_class_cancellation this delete is a completion, not a
    -- cancellation (transaction-local, cleared right after).
    PERFORM set_config('learn2lead.completing_class', 'on', true);
    DELETE FROM public.scheduled_classes WHERE id = p_class_id;
    PERFORM set_config('learn2lead.completing_class', 'off', true);

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Class completed successfully',
      'tutor_name', actual_tutor_name,
      'student_name', actual_student_name,
      'class_cost', v_class_cost,
      'tutor_cost', v_tutor_cost
    );

  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Class session already logged', 'code', 'DUPLICATE_SESSION');
    WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', 'DATABASE_ERROR');
  END;
END;
$function$;

-- Tutor "enough hours?" check and the like. A student with a parent reads
-- the family balance; everyone else reads exactly as before. Parents may ask
-- about their own children.
CREATE OR REPLACE FUNCTION public.get_student_credit_balance(p_student_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC;
  v_billing uuid;
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin'
     AND auth.uid() IS DISTINCT FROM p_student_id
     AND NOT public.is_guardian_of(p_student_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.tutor_student_assigned
       WHERE student_id = p_student_id AND tutor_id = auth.uid() AND active = true
     )
  THEN
    RAISE EXCEPTION 'Not authorized to view this student''s credit balance';
  END IF;

  v_billing := public.billing_account_for(p_student_id);

  IF v_billing = p_student_id THEN
    SELECT balance_after INTO v_balance
    FROM class_credits_ledger
    WHERE student_id = p_student_id
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    SELECT credits_remaining INTO v_balance
    FROM student_subscriptions
    WHERE student_id = v_billing AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  RETURN COALESCE(v_balance, 0);
END;
$function$;

-- Admin low-balance list: family balances belong to parents now, so include
-- them (named "(family)", last class across their children).
CREATE OR REPLACE FUNCTION public.get_students_credit_summary()
 RETURNS TABLE(student_name text, profile_id uuid, credits numeric, last_class_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    CASE WHEN p.role = 'parent' THEN
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), ''), p.email) || ' (family)'
    ELSE
      COALESCE(
        s.name,
        NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), '')
      )
    END                                AS student_name,
    p.id                               AS profile_id,
    ss.credits_remaining::NUMERIC      AS credits,
    (
      SELECT cl."Date"
      FROM   class_logs cl
      WHERE  cl.student_user_id = p.id
         OR  cl.student_user_id IN (SELECT gl.student_id FROM guardian_links gl WHERE gl.guardian_id = p.id)
      ORDER  BY cl."Date" DESC
      LIMIT  1
    )                                  AS last_class_date
  FROM student_subscriptions ss
  JOIN  profiles p ON p.id = ss.student_id AND p.role IN ('student', 'parent')
  LEFT JOIN students s ON s.email = p.email
  WHERE ss.status IN ('active', 'trialing')
    AND ss.credits_remaining <= 2
  ORDER BY ss.credits_remaining ASC, p.last_name ASC;
END;
$function$;

-- Admin "out of hours with classes coming up": a parent's balance covers
-- their children's classes.
CREATE OR REPLACE FUNCTION public.get_zero_credit_upcoming_students()
 RETURNS TABLE(student_name text, profile_id uuid, email text, credits_remaining numeric, next_class_date date, next_class_title text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin'
     AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RETURN;
  END IF;

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
    WHERE  (student_id = ss.student_id
            OR student_id IN (SELECT gl.student_id FROM guardian_links gl WHERE gl.guardian_id = ss.student_id))
      AND  date >= CURRENT_DATE
    ORDER  BY date ASC, start_time ASC
    LIMIT  1
  ) sc ON TRUE
  WHERE ss.status IN ('active', 'trialing')
    AND ss.credits_remaining <= 0
  ORDER BY sc.date ASC;
END;
$function$;

-- Admin "no class in 30+ days": a parent's activity is their children's.
CREATE OR REPLACE FUNCTION public.get_at_risk_students()
 RETURNS TABLE(student_name text, profile_id uuid, email text, credits_remaining numeric, last_class_date date, days_since_class integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin'
     AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RETURN;
  END IF;

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
  LEFT JOIN class_logs cl
    ON cl.student_user_id = p.id
    OR cl.student_user_id IN (SELECT gl.student_id FROM guardian_links gl WHERE gl.guardian_id = p.id)
  WHERE ss.status IN ('active', 'trialing')
  GROUP BY p.id, p.first_name, p.last_name, p.email, ss.credits_remaining
  HAVING
    MAX(cl."Date")::DATE < CURRENT_DATE - INTERVAL '30 days'
    OR MAX(cl."Date") IS NULL
  ORDER BY last_class_date ASC NULLS FIRST;
END;
$function$;

-- Daily reminders: same rows as before plus student_id and tutor_id, so
-- class-reminder can route each reminder (student and/or parent, tutor) by
-- each person's own channels. The return type
-- changes, hence DROP + CREATE (the deployed function ignores the extra
-- column until it's updated).
DROP FUNCTION public.get_tomorrow_scheduled_classes();
CREATE FUNCTION public.get_tomorrow_scheduled_classes()
 RETURNS TABLE(class_id uuid, title text, subject text, class_date date, class_start time without time zone, start_at timestamp with time zone, end_at timestamp with time zone, student_name text, student_email text, student_timezone text, tutor_name text, tutor_email text, tutor_timezone text, zoom_link text, student_notify_reminders boolean, tutor_notify_reminders boolean, student_id uuid, tutor_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    sc.id                                                    AS class_id,
    sc.title                                                 AS title,
    sc.subject                                               AS subject,
    sc.date                                                  AS class_date,
    sc.start_time                                            AS class_start,
    sc.start_at                                              AS start_at,
    sc.end_at                                                AS end_at,
    COALESCE(
      NULLIF(TRIM(CONCAT(COALESCE(sp.first_name,''),' ',COALESCE(sp.last_name,''))),
             ''), sp.email
    )                                                        AS student_name,
    sp.email                                                 AS student_email,
    sp.timezone                                              AS student_timezone,
    COALESCE(
      NULLIF(TRIM(CONCAT(COALESCE(tp.first_name,''),' ',COALESCE(tp.last_name,''))),
             ''), tp.email
    )                                                        AS tutor_name,
    tp.email                                                 AS tutor_email,
    tp.timezone                                              AS tutor_timezone,
    sc.zoom_link                                             AS zoom_link,
    COALESCE(sp.notify_class_reminders, true)               AS student_notify_reminders,
    COALESCE(tp.notify_class_reminders, true)               AS tutor_notify_reminders,
    sc.student_id                                            AS student_id,
    sc.tutor_id                                              AS tutor_id
  FROM public.scheduled_classes sc
  JOIN public.profiles sp ON sc.student_id = sp.id
  JOIN public.profiles tp ON sc.tutor_id   = tp.id
  -- "Tomorrow" is the next Central calendar day (sc.date holds Central date).
  WHERE sc.date = ((now() AT TIME ZONE 'America/Chicago')::date + 1)
    AND COALESCE(sc.reminder_24h_sent, false) = false
    -- Skip entirely only if every possible recipient opted out; otherwise
    -- partial send handled in app. A parent counts for their child.
    AND (
      COALESCE(sp.notify_class_reminders, true) = true
      OR COALESCE(tp.notify_class_reminders, true) = true
      OR EXISTS (
        SELECT 1 FROM public.guardian_links gl
        JOIN public.profiles gp ON gp.id = gl.guardian_id
        WHERE gl.student_id = sc.student_id
          AND COALESCE(gp.notify_class_reminders, true) = true
      )
    );
$function$;

-- ─── Parent read access (additive; existing policies untouched) ─────────────

CREATE POLICY "Parents can view their children's profiles and tutors" ON public.profiles
  FOR SELECT USING (
    get_auth_user_role() = 'parent'
    AND (
      id IN (SELECT public.my_child_ids())
      OR (
        role = 'tutor'::app_role
        AND EXISTS (
          SELECT 1 FROM public.tutor_student_assigned tsa
          WHERE tsa.tutor_id = profiles.id
            AND tsa.active = true
            AND tsa.student_id IN (SELECT public.my_child_ids())
        )
      )
    )
  );

CREATE POLICY "Parents can view their children's student records" ON public.students
  FOR SELECT USING (
    get_auth_user_role() = 'parent'
    AND lower(email) IN (
      SELECT lower(p.email) FROM public.profiles p WHERE p.id IN (SELECT public.my_child_ids())
    )
  );

CREATE POLICY "Parents can view their children's classes" ON public.scheduled_classes
  FOR SELECT USING (
    get_auth_user_role() = 'parent' AND student_id IN (SELECT public.my_child_ids())
  );

CREATE POLICY "Parents can view their children's class logs" ON public.class_logs
  FOR SELECT USING (
    get_auth_user_role() = 'parent' AND student_user_id IN (SELECT public.my_child_ids())
  );

CREATE POLICY "Parents can view their children's tutor assignments" ON public.tutor_student_assigned
  FOR SELECT USING (
    get_auth_user_role() = 'parent' AND student_id IN (SELECT public.my_child_ids())
  );

-- A child's class debits are recorded under the child but sit on the
-- parent's subscription.
CREATE POLICY "Parents can view their family hours history" ON public.class_credits_ledger
  FOR SELECT USING (
    get_auth_user_role() = 'parent'
    AND subscription_id IN (
      SELECT ss.id FROM public.student_subscriptions ss WHERE ss.student_id = auth.uid()
    )
  );

-- ─── Grants ─────────────────────────────────────────────────────────────────

-- Service role only: called by edge functions after they verify the caller.
REVOKE ALL ON FUNCTION public.guardian_of(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.billing_account_for(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_student_history(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_notification_recipients(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.register_managed_student(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_guardian_invite(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_guardian_invite(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_tomorrow_scheduled_classes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardian_of(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_account_for(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_student_history(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.student_notification_recipients(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.register_managed_student(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_guardian_invite(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_guardian_invite(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_tomorrow_scheduled_classes() TO service_role;

-- Used inside RLS policies, which every role evaluates, so every role may
-- run them; both are scoped to auth.uid() and return nothing for anyone who
-- isn't a parent.
GRANT EXECUTE ON FUNCTION public.my_child_ids() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_guardian_of(uuid) TO anon, authenticated, service_role;

-- Signed-in users: each checks the caller itself (auth.uid() / admin role).
REVOKE ALL ON FUNCTION public.become_family_account() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_children() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_my_child(uuid, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_child_calendar_feed_token(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rotate_child_calendar_feed_token(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_family_hours_history(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_pending_guardian_invites() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_family_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_my_guardian_invite() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_unlink_guardian(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.convert_account_to_family(uuid, uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.become_family_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_children() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_child(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_child_calendar_feed_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_child_calendar_feed_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_family_hours_history(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_pending_guardian_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_family_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_guardian_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unlink_guardian(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_account_to_family(uuid, uuid, text, text, boolean) TO authenticated;

-- Links and invites are written only by the functions above; signed-in users
-- read what RLS shows them.
REVOKE ALL ON public.guardian_links, public.guardian_invites FROM anon, authenticated;
GRANT SELECT ON public.guardian_links, public.guardian_invites TO authenticated;
GRANT ALL ON public.guardian_links, public.guardian_invites TO service_role;
