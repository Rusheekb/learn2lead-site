-- Signed-out access, admin-only functions, access-rule performance shape.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', msg; END IF; RAISE NOTICE 'ok - %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', CASE WHEN p IS NULL THEN '{"role":"service_role"}' ELSE json_build_object('sub', p, 'role', 'authenticated')::text END, true); $$;
CREATE OR REPLACE FUNCTION pg_temp.mk(p_email text, p_meta jsonb DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid := gen_random_uuid(); BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, created_at) VALUES (v, p_email, p_meta, '{}', now()); RETURN v; END $$;

-- Signed-out visitors can run only the allowlisted SECURITY DEFINER functions.
SELECT pg_temp.ok(
  (SELECT coalesce(array_agg(p.proname::text ORDER BY p.proname), '{}')
   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE'))
  = ARRAY['check_username','get_auth_user_display_name','get_auth_user_email','get_auth_user_role','get_public_referral_code','has_guardian','my_child_ids'],
  'signed out: only the allowlisted functions are callable');
SELECT pg_temp.ok(NOT EXISTS (
   SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
     AND (has_function_privilege('authenticated', p.oid, 'EXECUTE') OR has_function_privilege('anon', p.oid, 'EXECUTE'))
     AND p.proname IN ('auto_create_class_log','handle_new_user_profile','validate_role_change','sync_subscription_credits')),
  'trigger functions are not callable through the API');
SELECT pg_temp.ok(NOT EXISTS (
   SELECT 1 FROM pg_policies WHERE schemaname = 'public'
     AND (coalesce(qual,'') || coalesce(with_check,'')) ~ '(?<!SELECT )(auth\.uid\(\)|get_auth_user_role\(\))'),
  'every access rule evaluates the caller once per query');

-- Triggers still fire after their EXECUTE grants were removed.
SELECT pg_temp.as_user(NULL);
CREATE TEMP TABLE ids (k text PRIMARY KEY, v uuid);
GRANT SELECT ON ids TO authenticated;
INSERT INTO ids VALUES
 ('admin', pg_temp.mk('ada@h.dev', '{"first_name":"Ada","last_name":"Admin"}')),
 ('stu', pg_temp.mk('sam@h.dev', '{"first_name":"Sam","last_name":"Student"}')),
 ('other', pg_temp.mk('oz@h.dev', '{"first_name":"Oz","last_name":"Other"}'));
SELECT pg_temp.ok((SELECT count(*) FROM profiles WHERE email LIKE '%@h.dev' AND username IS NOT NULL) = 3, 'sign-up trigger still creates profiles with usernames');
UPDATE profiles SET role = 'admin' WHERE id = (SELECT v FROM ids WHERE k='admin');
INSERT INTO referral_codes (code, created_by, stripe_coupon_id) VALUES ('SAMCODE1', (SELECT v FROM ids WHERE k='stu'), 'coupon_test');
INSERT INTO referral_usage (referral_code_id, used_by_user_id, used_by_email)
  VALUES ((SELECT id FROM referral_codes WHERE code = 'SAMCODE1'), (SELECT v FROM ids WHERE k='other'), 'oz@h.dev');

SET ROLE authenticated;
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='stu'));
DO $$ BEGIN
  PERFORM get_class_log_totals(NULL, NULL, NULL);
  RAISE EXCEPTION 'FAIL: a student read the class-log totals';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - non-admins can''t read business totals';
END $$;
SELECT pg_temp.ok((SELECT times_used FROM get_referral_usage_stats((SELECT v FROM ids WHERE k='stu'))) = 1, 'your own referral stats still work');
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='other'));
SELECT pg_temp.ok((SELECT times_used = 0 AND latest_usage IS NULL FROM get_referral_usage_stats((SELECT v FROM ids WHERE k='stu'))), 'someone else''s referral stats come back empty');
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='admin'));
SELECT pg_temp.ok((get_class_log_totals(NULL, NULL, NULL) ? 'total_count'), 'admins still get the totals');
RESET ROLE;

SET ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$ BEGIN
  PERFORM get_class_log_totals(NULL, NULL, NULL);
  RAISE EXCEPTION 'FAIL: signed out read the class-log totals';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - signed out: business totals refused';
END $$;
SELECT pg_temp.ok((check_username('fresh.name') ->> 'available')::boolean, 'signed out: the sign-up username check still works');
RESET ROLE;

