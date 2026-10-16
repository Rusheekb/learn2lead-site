-- Notification foundation: contact methods and per-channel preferences.
-- See docs/family-accounts-plan.md ("Foundation for messaging and texts").
--
-- Every person has their own contact details and their own choices, per
-- kind of notification and per channel (email now, text messages once a
-- number is verified and opted in). Edge functions ask
-- notification_targets() who to reach and how, and send through one
-- dispatcher (_shared/notify.ts).
--
-- Email defaults reproduce today's behaviour exactly: class reminders follow
-- profiles.notify_class_reminders, hours/billing emails follow
-- profiles.notify_low_credits, everything else is on. Texts are off until
-- someone verifies a number and turns them on.

-- ─── Contact methods (mobile numbers for now; email stays on the profile) ──
CREATE TABLE public.contact_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('sms')),
  value text NOT NULL CHECK (value ~ '^\+[1-9][0-9]{7,14}$'),
  verified_at timestamptz,
  -- Text-message consent, recorded when given (carrier requirement).
  opted_in_at timestamptz,
  opted_out_at timestamptz,
  consent_text text,
  verification_code_hash text,
  verification_expires_at timestamptz,
  verification_attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, kind)
);
CREATE INDEX contact_methods_value_idx ON public.contact_methods (value);

ALTER TABLE public.contact_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People can view their own contact methods" ON public.contact_methods
  FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Admins can view contact methods" ON public.contact_methods
  FOR SELECT USING (get_auth_user_role() = 'admin');
-- Written only by the sms-verification function; the code hash is never readable.
REVOKE ALL ON public.contact_methods FROM anon, authenticated;
GRANT SELECT (id, profile_id, kind, value, verified_at, opted_in_at, opted_out_at, created_at)
  ON public.contact_methods TO authenticated;
GRANT ALL ON public.contact_methods TO service_role;

-- ─── Preferences ────────────────────────────────────────────────────────────
CREATE TABLE public.notification_preferences (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('class_reminders', 'class_updates', 'billing', 'summaries', 'messages')),
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  enabled boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, category, channel)
);

COMMENT ON TABLE public.notification_preferences IS
  'Per person, per kind, per channel. A missing row means the default (see notification_targets).';

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People manage their own notification preferences" ON public.notification_preferences
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Admins can view notification preferences" ON public.notification_preferences
  FOR SELECT USING (get_auth_user_role() = 'admin');
REVOKE ALL ON public.notification_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

-- ─── Resolution ─────────────────────────────────────────────────────────────

-- How one person wants to hear about one kind of thing.
CREATE OR REPLACE FUNCTION public.notification_target_for(p_profile_id uuid, p_category text)
RETURNS TABLE(
  user_id uuid,
  email text,
  phone text,
  first_name text,
  last_name text,
  timezone text,
  email_enabled boolean,
  sms_enabled boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id,
         CASE WHEN p.managed THEN p.notification_email ELSE p.email END,
         CASE WHEN cm.verified_at IS NOT NULL AND cm.opted_in_at IS NOT NULL AND cm.opted_out_at IS NULL
              THEN cm.value END,
         p.first_name, p.last_name, p.timezone,
         COALESCE(
           (SELECT np.enabled FROM public.notification_preferences np
            WHERE np.profile_id = p.id AND np.category = p_category AND np.channel = 'email'),
           CASE p_category
             WHEN 'class_reminders' THEN COALESCE(p.notify_class_reminders, true)
             WHEN 'billing' THEN COALESCE(p.notify_low_credits, true)
             ELSE true
           END
         ),
         COALESCE(
           (SELECT np.enabled FROM public.notification_preferences np
            WHERE np.profile_id = p.id AND np.category = p_category AND np.channel = 'sms'),
           false
         )
         AND cm.verified_at IS NOT NULL AND cm.opted_in_at IS NOT NULL AND cm.opted_out_at IS NULL
  FROM public.profiles p
  LEFT JOIN public.contact_methods cm ON cm.profile_id = p.id AND cm.kind = 'sms'
  WHERE p.id = p_profile_id
    AND p_category IN ('class_reminders', 'class_updates', 'billing', 'summaries', 'messages');
$function$;

-- Everyone to reach about a student for one kind of thing: the same people
-- as student_notification_recipients (class reminders, class updates and
-- messages go to the student and their parent; billing and summaries to
-- whoever pays), each with their own channels and choices.
CREATE OR REPLACE FUNCTION public.notification_targets(p_student_id uuid, p_category text)
RETURNS TABLE(
  user_id uuid,
  email text,
  phone text,
  first_name text,
  last_name text,
  timezone text,
  is_guardian boolean,
  email_enabled boolean,
  sms_enabled boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT t.user_id, r.email, t.phone, t.first_name, t.last_name, t.timezone,
         r.is_guardian, t.email_enabled, t.sms_enabled
  FROM public.student_notification_recipients(
         p_student_id,
         CASE WHEN p_category IN ('billing', 'summaries') THEN 'parent_only' ELSE 'student' END
       ) r
  CROSS JOIN LATERAL public.notification_target_for(r.user_id, p_category) t
  UNION ALL
  -- A student without a deliverable email can still be texted.
  SELECT t.user_id, NULL, t.phone, t.first_name, t.last_name, t.timezone, false,
         false, t.sms_enabled
  FROM public.notification_target_for(p_student_id, p_category) t
  WHERE p_category NOT IN ('billing', 'summaries')
    AND t.sms_enabled
    AND NOT EXISTS (
      SELECT 1 FROM public.student_notification_recipients(p_student_id, 'student') r
      WHERE r.user_id = p_student_id
    );
$function$;

REVOKE ALL ON FUNCTION public.notification_target_for(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notification_targets(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notification_target_for(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.notification_targets(uuid, text) TO service_role;
