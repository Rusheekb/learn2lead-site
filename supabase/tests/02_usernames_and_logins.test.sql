-- Usernames, sign-up username rules, student logins managed by parents.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', msg; END IF; RAISE NOTICE 'ok - %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', CASE WHEN p IS NULL THEN '{"role":"service_role"}' ELSE json_build_object('sub', p, 'role', 'authenticated')::text END, false); $$;
CREATE OR REPLACE FUNCTION pg_temp.mk(p_email text, p_meta jsonb DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid := gen_random_uuid(); BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, created_at) VALUES (v, p_email, p_meta, '{}', now()); RETURN v; END $$;
CREATE OR REPLACE FUNCTION pg_temp.uname(p_email text) RETURNS text LANGUAGE sql AS $$ SELECT username FROM profiles WHERE email = p_email $$;
SELECT pg_temp.as_user(NULL);

-- ─── New sign-ups ─────────────────────────────────────────────────────────
SELECT pg_temp.mk('new1@x.dev', '{"first_name":"Nina","last_name":"Patel","username":"Nina_P"}');
SELECT pg_temp.ok(pg_temp.uname('new1@x.dev') = 'nina_p', 'the chosen username is used (lowercased)');
SELECT pg_temp.mk('new2@x.dev', '{"first_name":"Nina","last_name":"Patel","username":"nina_p"}');
SELECT pg_temp.ok(pg_temp.uname('new2@x.dev') = 'nina.patel', 'a taken username falls back to a generated one');
SELECT pg_temp.mk('new3@x.dev', '{"first_name":"Ray","last_name":"Ng","username":"no spaces!"}');
SELECT pg_temp.ok(pg_temp.uname('new3@x.dev') = 'ray.ng', 'an invalid username falls back to a generated one');
SELECT pg_temp.mk('new4@x.dev', '{"full_name":"Gina Google"}');
SELECT pg_temp.ok(pg_temp.uname('new4@x.dev') = 'gina.google', 'Google sign-ups get one from their Google name');

-- ─── Checks and changes ───────────────────────────────────────────────────
SELECT pg_temp.ok((check_username('nina_p') ->> 'reason') = 'taken', 'check: taken');
SELECT pg_temp.ok((check_username('NINA_P ') ->> 'reason') = 'taken', 'check: case and spaces don''t sneak a duplicate past');
SELECT pg_temp.ok((check_username('ab') ->> 'reason') = 'invalid', 'check: too short');
SELECT pg_temp.ok((check_username('a..b') ->> 'reason') = 'invalid', 'check: double dots');
SELECT pg_temp.ok((check_username('support') ->> 'reason') = 'reserved', 'check: reserved');
SELECT pg_temp.ok((check_username('fresh.name') ->> 'available')::boolean, 'check: available');

SELECT pg_temp.as_user((SELECT id FROM profiles WHERE email = 'new3@x.dev'));
SELECT pg_temp.ok((check_username('ray.ng') ->> 'available')::boolean, 'your own current username counts as available to you');
SELECT pg_temp.ok((set_my_username('Ray.Codes') ->> 'success')::boolean, 'a user changes their username');
SELECT pg_temp.ok(pg_temp.uname('new3@x.dev') = 'ray.codes', 'stored lowercase');
SELECT pg_temp.ok((set_my_username('nina_p') ->> 'error') = 'taken', 'can''t take someone else''s');
SET ROLE authenticated;
DO $$ BEGIN
  UPDATE profiles SET username = 'Bad Name' WHERE id = auth.uid();
  RAISE EXCEPTION 'FAIL: invalid username saved directly';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'ok - an invalid username can''t be saved even by a direct update';
END $$;
DO $$ BEGIN
  UPDATE profiles SET username = NULL WHERE id = auth.uid();
  IF (SELECT username FROM profiles WHERE id = auth.uid()) IS NULL THEN RAISE EXCEPTION 'FAIL: username removed'; END IF;
  RAISE NOTICE 'ok - a username can''t be removed';
END $$;
RESET ROLE;

-- ─── Parent-added students and what they can't change ────────────────────
SELECT pg_temp.as_user(NULL);
CREATE TEMP TABLE ids (k text PRIMARY KEY, v uuid);
GRANT SELECT ON ids TO authenticated;
INSERT INTO ids VALUES ('parent', pg_temp.mk('pat@x.dev', '{"first_name":"Pat","last_name":"Lee","account_type":"parent"}'));
INSERT INTO ids VALUES ('maya', pg_temp.mk('student-00000000-0000-0000-0000-0000000000aa@managed.learn2lead.page', '{"first_name":"Maya","last_name":"Lee"}'));
SELECT register_managed_student((SELECT v FROM ids WHERE k='parent'), (SELECT v FROM ids WHERE k='maya'), '7', NULL);
SELECT pg_temp.ok((SELECT username FROM profiles WHERE id = (SELECT v FROM ids WHERE k='maya')) = 'maya.lee', 'a parent-added student gets a username from their name, not the placeholder');
SELECT pg_temp.ok(login_email_for_username('Maya.Lee') = 'student-00000000-0000-0000-0000-0000000000aa@managed.learn2lead.page', 'username login finds the internal address (server only)');

SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='maya'));
SET ROLE authenticated;
DO $$ BEGIN
  PERFORM login_email_for_username('maya.lee');
  RAISE EXCEPTION 'FAIL: a signed-in user resolved a username to an email';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - users can''t turn a username into an email';
END $$;
DO $$ BEGIN
  UPDATE profiles SET hide_hours_from_student = false, managed = false WHERE id = auth.uid();
  RAISE EXCEPTION 'FAIL: student changed parent controls';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - a student can''t change parent controls';
END $$;
DO $$ BEGIN
  UPDATE profiles SET username = 'maya.cool' WHERE id = auth.uid();
  RAISE EXCEPTION 'FAIL: managed student changed username';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - a parent-added student can''t change their username';
END $$;
SELECT pg_temp.ok((set_my_username('maya.cool') ->> 'error') = 'managed_by_parent', 'set_my_username refuses for a parent-added student');
UPDATE profiles SET timezone = 'America/New_York' WHERE id = auth.uid();
SELECT pg_temp.ok((SELECT timezone FROM profiles WHERE id = auth.uid()) = 'America/New_York', 'a student can still change their own ordinary settings');
SELECT clear_must_change_password();
RESET ROLE;

SELECT pg_temp.as_user(NULL);
UPDATE profiles SET must_change_password = true WHERE id = (SELECT v FROM ids WHERE k='maya');
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='parent'));
SELECT pg_temp.ok((set_student_hours_visibility((SELECT v FROM ids WHERE k='maya'), false) ->> 'success')::boolean, 'the parent still controls hours visibility');
SELECT pg_temp.ok((get_student_login_status((SELECT v FROM ids WHERE k='maya')) ->> 'username') = 'maya.lee'
  AND NOT (get_student_login_status((SELECT v FROM ids WHERE k='maya')) ->> 'has_password')::boolean
  AND (get_student_login_status((SELECT v FROM ids WHERE k='maya')) ->> 'must_change_password')::boolean,
  'parent sees the login status');
SELECT pg_temp.ok((SELECT username FROM get_my_children() LIMIT 1) = 'maya.lee', 'the parent''s list includes the username');
SELECT pg_temp.as_user((SELECT id FROM profiles WHERE email = 'new1@x.dev'));
DO $$ BEGIN
  PERFORM get_student_login_status((SELECT v FROM ids WHERE k='maya'));
  RAISE EXCEPTION 'FAIL: stranger read login status';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  RAISE NOTICE 'ok - only the parent (or admin) sees a student''s login status';
END $$;
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='maya'));
SELECT clear_must_change_password();
SELECT pg_temp.ok(NOT (SELECT must_change_password FROM profiles WHERE id = (SELECT v FROM ids WHERE k='maya')), 'the student clears the first-login flag after choosing a password');
