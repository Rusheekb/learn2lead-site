-- Conversations: who can see, post and start them; alerts; flood limit.
\set ON_ERROR_STOP 1
SET client_min_messages = notice;
CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', msg; END IF; RAISE NOTICE 'ok - %', msg; END $$;
CREATE OR REPLACE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', CASE WHEN p IS NULL THEN '{"role":"service_role"}' ELSE json_build_object('sub', p, 'role', 'authenticated')::text END, true); $$;
CREATE OR REPLACE FUNCTION pg_temp.mk(p_email text, p_meta jsonb DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid := gen_random_uuid(); BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, created_at) VALUES (v, p_email, p_meta, '{}', now()); RETURN v; END $$;
-- Expect an error whose message contains `expect`.
CREATE OR REPLACE FUNCTION pg_temp.fails(q text, expect text, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE q; EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ILIKE '%' || expect || '%' THEN RAISE NOTICE 'ok - %', msg; RETURN; END IF;
    RAISE EXCEPTION 'FAIL: % (got: %)', msg, SQLERRM;
  END;
  RAISE EXCEPTION 'FAIL: % (no error)', msg;
END $$;

SELECT pg_temp.as_user(NULL);
CREATE TEMP TABLE ids (k text PRIMARY KEY, v uuid);
GRANT SELECT ON ids TO authenticated;
CREATE OR REPLACE FUNCTION pg_temp.id(k text) RETURNS uuid LANGUAGE sql AS $$ SELECT v FROM ids WHERE ids.k = $1 $$;
CREATE TEMP TABLE t (k text PRIMARY KEY, v uuid);
GRANT SELECT, INSERT ON t TO authenticated;
INSERT INTO ids VALUES
 ('tutor', pg_temp.mk('tara@x.dev', '{"first_name":"Tara","last_name":"Tutor"}')),
 ('tutor2', pg_temp.mk('ted@x.dev', '{"first_name":"Ted","last_name":"Other"}')),
 ('adult', pg_temp.mk('al@x.dev', '{"first_name":"Al","last_name":"Adult"}')),
 ('outsider', pg_temp.mk('olive@x.dev', '{"first_name":"Olive","last_name":"Out"}')),
 ('admin', pg_temp.mk('ada@x.dev', '{"first_name":"Ada","last_name":"Admin"}')),
 ('parent', pg_temp.mk('pat@x.dev', '{"first_name":"Pat","last_name":"Lee","account_type":"parent"}')),
 ('kid', pg_temp.mk('student-00000000-0000-0000-0000-0000000000dd@managed.learn2lead.page', '{"first_name":"Maya","last_name":"Lee"}'));
UPDATE profiles SET role = 'tutor' WHERE id IN (pg_temp.id('tutor'), pg_temp.id('tutor2'));
UPDATE profiles SET role = 'admin' WHERE id = pg_temp.id('admin');
SELECT register_managed_student(pg_temp.id('parent'), pg_temp.id('kid'), '5', NULL);
INSERT INTO tutor_student_assigned (tutor_id, student_id, active, subject) VALUES
 (pg_temp.id('tutor'), pg_temp.id('adult'), true, 'Math'),
 (pg_temp.id('tutor'), pg_temp.id('kid'), true, 'Math');

SET ROLE authenticated;

-- Who can start a conversation.
SELECT pg_temp.as_user(pg_temp.id('parent'));
SELECT pg_temp.ok((SELECT array_agg(student_name || '/' || tutor_name) FROM get_messageable_pairs()) = ARRAY['Maya Lee/Tara Tutor'], 'a parent can message their child''s tutor');
INSERT INTO t VALUES ('kidthread', get_or_create_thread(pg_temp.id('kid'), pg_temp.id('tutor')));
SELECT pg_temp.ok((SELECT v FROM t WHERE k='kidthread') IS NOT NULL, 'the parent opens the family conversation');
SELECT pg_temp.as_user(pg_temp.id('tutor'));
SELECT pg_temp.ok((SELECT count(*) FROM get_messageable_pairs()) = 2, 'a tutor can message each assigned student');
SELECT pg_temp.ok(get_or_create_thread(pg_temp.id('kid'), pg_temp.id('tutor')) = (SELECT v FROM t WHERE k='kidthread'), 'one conversation per student and tutor');
SELECT pg_temp.as_user(pg_temp.id('adult'));
INSERT INTO t VALUES ('adultthread', get_or_create_thread(pg_temp.id('adult'), pg_temp.id('tutor')));
SELECT pg_temp.as_user(pg_temp.id('tutor2'));
SELECT pg_temp.ok((SELECT count(*) FROM get_messageable_pairs()) = 0, 'an unassigned tutor has no one to message');
SELECT pg_temp.fails($$SELECT get_or_create_thread(pg_temp.id('kid'), pg_temp.id('tutor2'))$$, 'Not authorized', 'an unassigned tutor can''t start a conversation');
SELECT pg_temp.fails($$SELECT get_or_create_thread(pg_temp.id('kid'), pg_temp.id('tutor'))$$, 'Not authorized', '...or open someone else''s');
SELECT pg_temp.as_user(pg_temp.id('outsider'));
SELECT pg_temp.fails($$SELECT get_or_create_thread(pg_temp.id('adult'), pg_temp.id('tutor'))$$, 'Not authorized', 'an outsider can''t open a conversation');

-- Posting and reading.
SELECT pg_temp.as_user(pg_temp.id('tutor'));
INSERT INTO t VALUES ('m1', post_message((SELECT v FROM t WHERE k='kidthread'), '  Great work today, Maya!  '));
SELECT pg_temp.ok((SELECT body FROM messages WHERE id = (SELECT v FROM t WHERE k='m1')) = 'Great work today, Maya!', 'the tutor posts (trimmed)');
SELECT pg_temp.fails($$SELECT post_message((SELECT v FROM t WHERE k='kidthread'), '   ')$$, '1 to 4000', 'empty messages are refused');
SELECT pg_temp.fails($$SELECT post_message((SELECT v FROM t WHERE k='kidthread'), repeat('x', 4001))$$, '1 to 4000', 'very long messages are refused');
SELECT pg_temp.fails($$INSERT INTO messages (thread_id, sender_id, body) VALUES ((SELECT v FROM t WHERE k='kidthread'), auth.uid(), 'sneaky')$$, 'permission denied', 'messages can''t be inserted directly');
SELECT pg_temp.fails($$UPDATE messages SET body = 'edited'$$, 'permission denied', 'messages can''t be edited');
SELECT pg_temp.fails($$DELETE FROM messages$$, 'permission denied', 'messages can''t be deleted');
SELECT pg_temp.fails($$INSERT INTO message_reads (thread_id, profile_id, last_read_at) VALUES ((SELECT v FROM t WHERE k='kidthread'), auth.uid(), now())$$, 'permission denied', 'read markers only change through the app functions');

SELECT pg_temp.as_user(pg_temp.id('kid'));
SELECT pg_temp.ok((SELECT count(*) FROM messages) = 1 AND (SELECT count(*) FROM message_threads) = 1, 'the student sees their conversation');
SELECT pg_temp.ok((SELECT unread_count = 1 AND can_post AND my_role = 'student' AND tutor_name = 'Tara Tutor' AND last_message_preview = 'Great work today, Maya!' FROM get_my_threads()), 'the student''s inbox: 1 unread');
SELECT pg_temp.ok((SELECT sender_name || ' (' || sender_role || '): ' || body FROM get_thread_messages((SELECT v FROM t WHERE k='kidthread'))) = 'Tara Tutor (tutor): Great work today, Maya!', 'messages show who sent them');
SELECT mark_thread_read((SELECT v FROM t WHERE k='kidthread'));
SELECT pg_temp.ok(get_unread_message_count() = 0, 'opening the conversation clears unread');

SELECT pg_temp.as_user(pg_temp.id('parent'));
SELECT pg_temp.ok((SELECT unread_count = 1 AND my_role = 'parent' FROM get_my_threads()), 'the parent sees the tutor''s message too (D13)');
SELECT pg_temp.ok((SELECT array_agg(role || ':' || name ORDER BY role) FROM get_thread_participants((SELECT v FROM t WHERE k='kidthread'))) = ARRAY['parent:Pat Lee', 'student:Maya Lee', 'tutor:Tara Tutor'], 'everyone can see who''s in the conversation');
SELECT post_message((SELECT v FROM t WHERE k='kidthread'), 'Thanks! Can we move Thursday?');

SELECT pg_temp.as_user(pg_temp.id('outsider'));
SELECT pg_temp.ok((SELECT count(*) FROM messages) = 0 AND (SELECT count(*) FROM message_threads) = 0 AND (SELECT count(*) FROM get_my_threads()) = 0, 'an outsider sees nothing');
SELECT pg_temp.fails($$SELECT * FROM get_thread_messages((SELECT v FROM t WHERE k='kidthread'))$$, 'Not authorized', '...and can''t read by id');
SELECT pg_temp.fails($$SELECT * FROM get_thread_participants((SELECT v FROM t WHERE k='kidthread'))$$, 'Not authorized', '...or list who''s in it');
SELECT pg_temp.fails($$SELECT post_message((SELECT v FROM t WHERE k='kidthread'), 'hi')$$, 'Not authorized', '...or post');
SELECT pg_temp.as_user(pg_temp.id('tutor2'));
SELECT pg_temp.ok((SELECT count(*) FROM messages) = 0, 'another tutor sees nothing');
SELECT pg_temp.as_user(pg_temp.id('adult'));
SELECT pg_temp.ok((SELECT count(*) FROM messages) = 0 AND (SELECT count(*) FROM get_my_threads()) = 1, 'another student sees only their own conversation');
SELECT pg_temp.fails($$SELECT thread_role((SELECT v FROM t WHERE k='kidthread'), auth.uid())$$, 'permission denied', 'internal helpers aren''t callable');
SELECT pg_temp.fails($$SELECT * FROM claim_message_alerts((SELECT v FROM t WHERE k='m1'))$$, 'permission denied', 'only the server claims alerts');

-- Admins: oversight of every conversation, unread only where they've engaged.
SELECT pg_temp.as_user(pg_temp.id('admin'));
SELECT pg_temp.ok((SELECT count(*) FROM get_my_threads()) = 2 AND get_unread_message_count() = 0, 'admins see every conversation without a flood of unread');
SELECT pg_temp.ok((SELECT count(*) FROM get_messageable_pairs()) = 2, 'admins can message any active pair');
INSERT INTO t VALUES ('m_admin', post_message((SELECT v FROM t WHERE k='kidthread'), 'Hi all, Ada from Learn2Lead here.'));
SELECT pg_temp.ok((SELECT sender_role FROM get_thread_messages((SELECT v FROM t WHERE k='kidthread')) m WHERE m.id = (SELECT v FROM t WHERE k='m_admin')) = 'staff', 'admin messages are labeled as staff');

-- Ended assignments: history stays, posting stops (except for admins).
RESET ROLE;
SELECT pg_temp.as_user(NULL);
UPDATE tutor_student_assigned SET active = false WHERE student_id = pg_temp.id('kid');
SET ROLE authenticated;
SELECT pg_temp.as_user(pg_temp.id('tutor'));
SELECT pg_temp.ok((SELECT NOT can_post FROM get_my_threads() WHERE student_id = pg_temp.id('kid')), 'after the match ends, the conversation is read-only');
SELECT pg_temp.ok((SELECT count(*) FROM get_thread_messages((SELECT v FROM t WHERE k='kidthread'))) = 3, '...history is kept');
SELECT pg_temp.fails($$SELECT post_message((SELECT v FROM t WHERE k='kidthread'), 'still there?')$$, 'Not authorized', '...and the tutor can''t post');
SELECT pg_temp.as_user(pg_temp.id('admin'));
SELECT post_message((SELECT v FROM t WHERE k='kidthread'), 'Closing this out — thanks everyone.');
SELECT pg_temp.ok(true, 'admins can still post');
RESET ROLE;
SELECT pg_temp.as_user(NULL);
UPDATE tutor_student_assigned SET active = true WHERE student_id = pg_temp.id('kid');

-- Alerts: everyone but the sender, at most once per burst.
DELETE FROM message_reads WHERE profile_id <> pg_temp.id('tutor');
SELECT pg_temp.ok((SELECT array_agg(role ORDER BY role) FROM claim_message_alerts((SELECT v FROM t WHERE k='m1'))) = ARRAY['parent', 'staff', 'student'], 'a tutor message alerts the student, parent and the admin who joined');
SELECT pg_temp.ok((SELECT count(*) FROM claim_message_alerts((SELECT v FROM t WHERE k='m1'))) = 0, 'no second alert within 10 minutes');
UPDATE message_reads SET last_notified_at = now() - interval '1 minute';
SELECT pg_temp.as_user(pg_temp.id('parent'));
SET ROLE authenticated;
SELECT mark_thread_read((SELECT v FROM t WHERE k='kidthread'));
RESET ROLE;
SELECT pg_temp.as_user(NULL);
SELECT pg_temp.ok((SELECT array_agg(role) FROM claim_message_alerts((SELECT v FROM t WHERE k='m1'))) = ARRAY['parent'], 'someone who read since their last alert gets the next one');
UPDATE message_reads SET last_notified_at = now() - interval '11 minutes';
SELECT pg_temp.ok((SELECT count(*) FROM claim_message_alerts((SELECT v FROM t WHERE k='m1'))) = 3, 'after 10 minutes, alerts resume');

-- Flood protection.
SET ROLE authenticated;
SELECT pg_temp.as_user(pg_temp.id('adult'));
SELECT post_message((SELECT v FROM t WHERE k='adultthread'), 'msg ' || g) FROM generate_series(1, 20) g;
SELECT pg_temp.fails($$SELECT post_message((SELECT v FROM t WHERE k='adultthread'), 'one more')$$, 'too quickly', 'more than 20 messages a minute are refused');
RESET ROLE;
