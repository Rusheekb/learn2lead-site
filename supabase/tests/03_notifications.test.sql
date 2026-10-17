-- Notification targets and preferences, contact-number privacy.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', msg; END IF; RAISE NOTICE 'ok - %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', CASE WHEN p IS NULL THEN '{"role":"service_role"}' ELSE json_build_object('sub', p, 'role', 'authenticated')::text END, false); $$;
CREATE OR REPLACE FUNCTION pg_temp.mk(p_email text, p_meta jsonb DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid := gen_random_uuid(); BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, created_at) VALUES (v, p_email, p_meta, '{}', now()); RETURN v; END $$;
SELECT pg_temp.as_user(NULL);
CREATE TEMP TABLE ids (k text PRIMARY KEY, v uuid);
GRANT SELECT ON ids TO authenticated;
INSERT INTO ids VALUES
 ('adult', pg_temp.mk('adult@x.dev', '{"first_name":"Al","last_name":"Adult"}')),
 ('quiet', pg_temp.mk('quiet@x.dev', '{"first_name":"Quinn","last_name":"Quiet"}')),
 ('parent', pg_temp.mk('pat@x.dev', '{"first_name":"Pat","last_name":"Lee","account_type":"parent"}')),
 ('kid', pg_temp.mk('student-00000000-0000-0000-0000-0000000000cc@managed.learn2lead.page', '{"first_name":"Kim","last_name":"Lee"}'));
SELECT register_managed_student((SELECT v FROM ids WHERE k='parent'), (SELECT v FROM ids WHERE k='kid'), '5', NULL);
UPDATE profiles SET notify_class_reminders = false, notify_low_credits = false WHERE email = 'quiet@x.dev';

-- Email defaults reproduce today exactly.
SELECT pg_temp.ok((SELECT email_enabled FROM notification_targets((SELECT v FROM ids WHERE k='adult'), 'class_reminders')), 'default: reminders by email on');
SELECT pg_temp.ok(NOT (SELECT email_enabled FROM notification_targets((SELECT v FROM ids WHERE k='quiet'), 'class_reminders')), 'reminders off follows the existing setting');
SELECT pg_temp.ok(NOT (SELECT email_enabled FROM notification_targets((SELECT v FROM ids WHERE k='quiet'), 'billing')), 'low-balance off follows the existing setting');
SELECT pg_temp.ok((SELECT email_enabled FROM notification_targets((SELECT v FROM ids WHERE k='quiet'), 'class_updates')), 'other kinds stay on');
SELECT pg_temp.ok(NOT (SELECT sms_enabled FROM notification_targets((SELECT v FROM ids WHERE k='adult'), 'class_reminders')), 'texts off by default');

-- A preference row overrides the default.
INSERT INTO notification_preferences VALUES ((SELECT v FROM ids WHERE k='quiet'), 'class_reminders', 'email', true, now());
SELECT pg_temp.ok((SELECT email_enabled FROM notification_targets((SELECT v FROM ids WHERE k='quiet'), 'class_reminders')), 'a saved preference wins');

-- Texts need a verified, opted-in number and the preference.
INSERT INTO notification_preferences VALUES ((SELECT v FROM ids WHERE k='adult'), 'class_reminders', 'sms', true, now());
INSERT INTO contact_methods (profile_id, kind, value) VALUES ((SELECT v FROM ids WHERE k='adult'), 'sms', '+15125550100');
SELECT pg_temp.ok(NOT (SELECT sms_enabled FROM notification_targets((SELECT v FROM ids WHERE k='adult'), 'class_reminders')), 'unverified number: no texts');
UPDATE contact_methods SET verified_at = now(), opted_in_at = now() WHERE profile_id = (SELECT v FROM ids WHERE k='adult');
SELECT pg_temp.ok((SELECT sms_enabled AND phone = '+15125550100' FROM notification_targets((SELECT v FROM ids WHERE k='adult'), 'class_reminders')), 'verified + opted in + preference: texts on');
SELECT pg_temp.ok(NOT (SELECT sms_enabled FROM notification_targets((SELECT v FROM ids WHERE k='adult'), 'billing')), 'only for the kinds turned on');
UPDATE contact_methods SET opted_out_at = now() WHERE profile_id = (SELECT v FROM ids WHERE k='adult');
SELECT pg_temp.ok(NOT (SELECT sms_enabled FROM notification_targets((SELECT v FROM ids WHERE k='adult'), 'class_reminders')) AND (SELECT phone IS NULL FROM notification_targets((SELECT v FROM ids WHERE k='adult'), 'class_reminders')), 'after STOP: no texts and no number handed out');

-- Families: who for which kind.
SELECT pg_temp.ok((SELECT array_agg(email ORDER BY email) FROM notification_targets((SELECT v FROM ids WHERE k='kid'), 'class_reminders')) = ARRAY['pat@x.dev'], 'child without email: parent gets reminders');
SELECT pg_temp.ok((SELECT count(*) FROM notification_targets((SELECT v FROM ids WHERE k='kid'), 'billing')) = 1 AND (SELECT bool_and(is_guardian) FROM notification_targets((SELECT v FROM ids WHERE k='kid'), 'billing')), 'billing: parent only');
-- The child gets a phone (e.g. a teen) and turns on message texts.
INSERT INTO contact_methods (profile_id, kind, value, verified_at, opted_in_at) VALUES ((SELECT v FROM ids WHERE k='kid'), 'sms', '+15125550111', now(), now());
INSERT INTO notification_preferences VALUES ((SELECT v FROM ids WHERE k='kid'), 'messages', 'sms', true, now());
SELECT pg_temp.ok((SELECT count(*) FROM notification_targets((SELECT v FROM ids WHERE k='kid'), 'messages') WHERE phone = '+15125550111' AND sms_enabled AND email IS NULL) = 1, 'a child with no email but a verified phone can be texted');
SELECT pg_temp.ok((SELECT count(*) FROM notification_targets((SELECT v FROM ids WHERE k='kid'), 'billing') WHERE user_id = (SELECT v FROM ids WHERE k='kid')) = 0, '...but never about billing');

-- Privacy of contact details.
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='adult'));
SET ROLE authenticated;
SELECT pg_temp.ok((SELECT count(*) FROM contact_methods) = 1, 'people see their own number');
DO $$ BEGIN
  PERFORM verification_code_hash FROM contact_methods;
  RAISE EXCEPTION 'FAIL: code hash readable';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - the verification code hash is never readable';
END $$;
DO $$ BEGIN
  INSERT INTO contact_methods (profile_id, kind, value, verified_at, opted_in_at) VALUES (auth.uid(), 'sms', '+15125550199', now(), now());
  RAISE EXCEPTION 'FAIL: user verified their own number directly';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - numbers can only be verified through the code flow';
END $$;
INSERT INTO notification_preferences VALUES (auth.uid(), 'summaries', 'email', false, now());
SELECT pg_temp.ok((SELECT count(*) FROM notification_preferences) = 2, 'people manage their own preferences');
DO $$ BEGIN
  INSERT INTO notification_preferences VALUES ((SELECT v FROM ids WHERE k='quiet'), 'summaries', 'email', false, now());
  RAISE EXCEPTION 'FAIL: changed someone else''s preferences';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN RAISE NOTICE 'ok - not someone else''s';
END $$;
DO $$ BEGIN
  PERFORM * FROM notification_targets((SELECT v FROM ids WHERE k='kid'), 'messages');
  RAISE EXCEPTION 'FAIL: user resolved targets';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - only the server resolves who to contact';
END $$;
RESET ROLE;
