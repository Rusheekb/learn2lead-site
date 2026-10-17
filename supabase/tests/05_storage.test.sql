-- Storage access rules: class files are private to the class; avatars and
-- shared files only accept uploads from their owner.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', msg; END IF; RAISE NOTICE 'ok - %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', CASE WHEN p IS NULL THEN '{"role":"anon"}' ELSE json_build_object('sub', p, 'role', 'authenticated')::text END, true); $$;
CREATE OR REPLACE FUNCTION pg_temp.mk(p_email text, p_meta jsonb DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid := gen_random_uuid(); BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, created_at) VALUES (v, p_email, p_meta, '{}', now()); RETURN v; END $$;
-- Whether the current role can insert an object (RLS decides).
CREATE OR REPLACE FUNCTION pg_temp.can_put(p_bucket text, p_name text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES (p_bucket, p_name, auth.uid()::text);
  RETURN true;
EXCEPTION WHEN insufficient_privilege THEN RETURN false;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.can_see(p_bucket text, p_name text) RETURNS boolean LANGUAGE sql AS $$
  SELECT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = p_bucket AND name = p_name) $$;

CREATE TEMP TABLE ids (k text PRIMARY KEY, v uuid);
GRANT SELECT ON ids TO authenticated, anon;
CREATE OR REPLACE FUNCTION pg_temp.id(k text) RETURNS uuid LANGUAGE sql AS $$ SELECT v FROM ids WHERE ids.k = $1 $$;
INSERT INTO ids VALUES
 ('tutor', pg_temp.mk('st.tutor@s.dev', '{"first_name":"Tia","last_name":"Tutor"}')),
 ('sam', pg_temp.mk('st.sam@s.dev', '{"first_name":"Sam","last_name":"Student"}')),
 ('other', pg_temp.mk('st.other@s.dev', '{"first_name":"Oli","last_name":"Other"}')),
 ('parent', pg_temp.mk('st.pat@s.dev', '{"first_name":"Pat","last_name":"Parent","account_type":"parent"}')),
 ('kid', pg_temp.mk('student-00000000-0000-0000-0000-0000000000ee@managed.learn2lead.page', '{"first_name":"Kim","last_name":"Parent"}'));
UPDATE profiles SET role = 'tutor' WHERE id = pg_temp.id('tutor');
SELECT register_managed_student(pg_temp.id('parent'), pg_temp.id('kid'), '6', NULL);
INSERT INTO ids VALUES ('samclass', gen_random_uuid()), ('kidclass', gen_random_uuid());
INSERT INTO scheduled_classes (id, title, tutor_id, student_id, subject, start_at, end_at, status) VALUES
 (pg_temp.id('samclass'), 'Algebra', pg_temp.id('tutor'), pg_temp.id('sam'), 'Math', now() + interval '1 day', now() + interval '1 day 1 hour', 'scheduled'),
 (pg_temp.id('kidclass'), 'Reading', pg_temp.id('tutor'), pg_temp.id('kid'), 'English', now() + interval '1 day', now() + interval '1 day 1 hour', 'scheduled');
CREATE TEMP TABLE f (k text PRIMARY KEY, v text);
GRANT SELECT ON f TO authenticated, anon;
CREATE OR REPLACE FUNCTION pg_temp.f(k text) RETURNS text LANGUAGE sql AS $$ SELECT v FROM f WHERE f.k = $1 $$;
INSERT INTO f VALUES
 ('hw', 'class_uploads/' || pg_temp.id('samclass') || '/hw.pdf'),
 ('mat', pg_temp.id('samclass') || '/notes.pdf'),
 ('kidmat', pg_temp.id('kidclass') || '/reading.pdf');

SELECT pg_temp.ok((SELECT NOT public FROM storage.buckets WHERE id = 'materials'), 'class files bucket is private');
SELECT pg_temp.ok((SELECT NOT public FROM storage.buckets WHERE id = 'shared_content'), 'shared files bucket is private');
SELECT pg_temp.ok((SELECT public FROM storage.buckets WHERE id = 'avatars'), 'avatars stay public to view');

SET ROLE authenticated;
SELECT pg_temp.as_user(pg_temp.id('sam'));
SELECT pg_temp.ok(pg_temp.can_put('materials', pg_temp.f('hw')), 'a student uploads to their own class');
SELECT pg_temp.as_user(pg_temp.id('other'));
SELECT pg_temp.ok(NOT pg_temp.can_put('materials', 'class_uploads/' || pg_temp.id('samclass') || '/x.pdf'), 'another student can''t upload into that class');
SELECT pg_temp.ok(pg_temp.can_put('materials', pg_temp.id('other') || '/mine.pdf'), 'anyone can upload to their own folder');
SELECT pg_temp.as_user(pg_temp.id('tutor'));
SELECT pg_temp.ok(pg_temp.can_put('materials', pg_temp.f('mat')) AND pg_temp.can_put('materials', pg_temp.f('kidmat')), 'the tutor adds materials to their classes');

SELECT pg_temp.ok(pg_temp.can_see('materials', pg_temp.f('hw')), 'the tutor sees the student''s homework');
SELECT pg_temp.as_user(pg_temp.id('sam'));
SELECT pg_temp.ok(pg_temp.can_see('materials', pg_temp.f('mat')), 'the student sees the tutor''s material');
SELECT pg_temp.ok(NOT pg_temp.can_see('materials', pg_temp.f('kidmat')), '...but not another family''s');
SELECT pg_temp.ok(NOT pg_temp.can_see('materials', pg_temp.id('other') || '/mine.pdf'), '...or another student''s own folder');
SELECT pg_temp.as_user(pg_temp.id('parent'));
SELECT pg_temp.ok(pg_temp.can_see('materials', pg_temp.f('kidmat')), 'a parent sees their child''s class material');
SELECT pg_temp.ok(NOT pg_temp.can_see('materials', pg_temp.f('hw')), '...and nobody else''s');
SELECT pg_temp.as_user(pg_temp.id('other'));
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id = 'materials') = 1, 'another student sees only their own file');

SELECT pg_temp.as_user(pg_temp.id('sam'));
SELECT pg_temp.ok(pg_temp.can_put('avatars', pg_temp.id('sam') || '-1.png'), 'you can upload your own avatar');
SELECT pg_temp.ok(NOT pg_temp.can_put('avatars', pg_temp.id('other') || '-1.png'), '...but not someone else''s');
SELECT pg_temp.ok(pg_temp.can_put('shared_content', pg_temp.id('sam') || '/a.pdf'), 'shared files go in your own folder');
SELECT pg_temp.ok(NOT pg_temp.can_put('shared_content', pg_temp.id('other') || '/b.pdf'), '...not someone else''s');
SELECT pg_temp.as_user(pg_temp.id('other'));
SELECT pg_temp.ok(NOT pg_temp.can_see('shared_content', pg_temp.id('sam') || '/a.pdf'), 'shared files are private to sender and receiver');
RESET ROLE;

SET ROLE anon;
SELECT pg_temp.as_user(NULL);
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id <> 'avatars') = 0, 'signed out: no files are visible (except public avatars)');
SELECT pg_temp.ok(NOT pg_temp.can_put('materials', 'x/anon.pdf') AND NOT pg_temp.can_put('avatars', 'x-1.png') AND NOT pg_temp.can_put('shared_content', 'x/1.pdf'), 'signed out: no uploads anywhere');
RESET ROLE;
