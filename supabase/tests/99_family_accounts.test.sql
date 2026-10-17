-- autocommit (needs distinct timestamps between steps; run on a fresh database)
-- Family accounts: billing and email routing, parent access, invites, conversion.
-- Family accounts: behaviour tests against a local schema copy (synthetic data only).
\set ON_ERROR_STOP 1
SET client_min_messages = warning;

CREATE OR REPLACE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', msg; END IF;
  RAISE NOTICE 'ok - %', msg;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.mk(p_email text, p_meta jsonb DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data, created_at)
  VALUES (v, p_email, p_meta, '{}', now());
  RETURN v;
END $$;

-- Act as a signed-in user (or nobody, for "system/service role" operations).
CREATE OR REPLACE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    CASE WHEN p IS NULL THEN '{"role":"service_role"}' ELSE json_build_object('sub', p, 'role', 'authenticated')::text END, false);
$$;

SET client_min_messages = notice;

-- ─── Seed ────────────────────────────────────────────────────────────────
SELECT pg_temp.as_user(NULL);
INSERT INTO subscription_plans (id, name, stripe_price_id, stripe_product_id, monthly_price, classes_per_month, price_per_hour)
VALUES ('00000000-0000-0000-0000-0000000000a1', '4-Hour Pack', 'price_4', 'prod_4', 160, 4, 40),
       ('00000000-0000-0000-0000-0000000000a2', '8-Hour Pack', 'price_8', 'prod_8', 280, 8, 35);

CREATE TEMP TABLE ids (k text PRIMARY KEY, v uuid);
GRANT SELECT ON ids TO authenticated;
INSERT INTO ids VALUES
  ('admin', pg_temp.mk('admin@test.dev', '{"first_name":"Ada","last_name":"Admin"}')),
  ('tutor', pg_temp.mk('tutor@test.dev', '{"first_name":"Tara","last_name":"Tutor"}')),
  ('adult', pg_temp.mk('adult@test.dev', '{"first_name":"Al","last_name":"Adult"}')),
  ('parent', pg_temp.mk('parent@test.dev', '{"first_name":"Pat","last_name":"Parent","account_type":"parent"}'));
UPDATE profiles SET role = 'tutor' WHERE id = (SELECT v FROM ids WHERE k = 'tutor');
UPDATE profiles SET role = 'admin' WHERE id = (SELECT v FROM ids WHERE k = 'admin');

SELECT pg_temp.ok((SELECT role::text FROM profiles WHERE id = (SELECT v FROM ids WHERE k='parent')) = 'parent',
  'signup with account_type=parent creates a parent profile');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM students WHERE email = 'parent@test.dev'),
  'a parent signup gets no students row');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM students WHERE email = 'adult@test.dev'),
  'a normal signup still gets a students row');

-- Children, as create-managed-student would: auth user, then register.
INSERT INTO ids VALUES
  ('kid1', pg_temp.mk('student-00000000-0000-0000-0000-000000000001@managed.learn2lead.page', '{"first_name":"Kim","last_name":"Parent"}')),
  ('kid2', pg_temp.mk('student-00000000-0000-0000-0000-000000000002@managed.learn2lead.page', '{"first_name":"Lee","last_name":"Parent"}'));
UPDATE profiles SET timezone = 'America/Los_Angeles' WHERE id = (SELECT v FROM ids WHERE k='parent');
SELECT pg_temp.ok((register_managed_student((SELECT v FROM ids WHERE k='parent'), (SELECT v FROM ids WHERE k='kid1'), '7', NULL) ->> 'success')::boolean,
  'register_managed_student links child 1');
SELECT pg_temp.ok((register_managed_student((SELECT v FROM ids WHERE k='parent'), (SELECT v FROM ids WHERE k='kid2'), '', '  Lee@Example.com ') ->> 'success')::boolean,
  'register_managed_student links child 2 with an email');
SELECT pg_temp.ok((SELECT managed AND timezone = 'America/Los_Angeles' AND notification_email = 'lee@example.com' FROM profiles WHERE id = (SELECT v FROM ids WHERE k='kid2')),
  'child is managed, inherits the parent''s time zone, email normalised');
SELECT pg_temp.ok((SELECT grade FROM students WHERE email LIKE 'student-00000000-0000-0000-0000-000000000001%') = '7',
  'child grade stored on the students row');
SELECT pg_temp.ok((register_managed_student((SELECT v FROM ids WHERE k='adult'), (SELECT v FROM ids WHERE k='kid1'), '7', NULL) ->> 'error') = 'not_a_parent',
  'only a parent can register a child');
SELECT pg_temp.ok((register_managed_student((SELECT v FROM ids WHERE k='parent'), (SELECT v FROM ids WHERE k='kid1'), '7', NULL) ->> 'error') = 'student_not_eligible',
  'an already-linked child cannot be registered again');

-- Billing: adult has their own pack; the parent has the family pack.
INSERT INTO student_subscriptions (id, student_id, plan_id, stripe_subscription_id, stripe_customer_id, status, credits_remaining, credits_allocated)
VALUES ('00000000-0000-0000-0000-00000000b001', (SELECT v FROM ids WHERE k='adult'), '00000000-0000-0000-0000-0000000000a1', 'purchase_adult', 'cus_adult', 'active', 0, 4),
       ('00000000-0000-0000-0000-00000000b002', (SELECT v FROM ids WHERE k='parent'), '00000000-0000-0000-0000-0000000000a2', 'purchase_parent', 'cus_parent', 'active', 0, 8);
SELECT apply_credit_ledger_entry((SELECT v FROM ids WHERE k='adult'), '00000000-0000-0000-0000-00000000b001', 'credit', 4, 'Purchased 4-Hour Pack', NULL, 'cs_adult');
SELECT apply_credit_ledger_entry((SELECT v FROM ids WHERE k='parent'), '00000000-0000-0000-0000-00000000b002', 'credit', 8, 'Purchased 8-Hour Pack', NULL, 'cs_parent');

-- Tutor assignments and tomorrow's classes for the adult and child 1.
INSERT INTO tutor_student_assigned (id, tutor_id, student_id, active, subject) VALUES
  ('00000000-0000-0000-0000-00000000c001', (SELECT v FROM ids WHERE k='tutor'), (SELECT v FROM ids WHERE k='adult'), true, 'Math'),
  ('00000000-0000-0000-0000-00000000c002', (SELECT v FROM ids WHERE k='tutor'), (SELECT v FROM ids WHERE k='kid1'), true, 'Math');
INSERT INTO scheduled_classes (id, title, tutor_id, student_id, subject, start_at, end_at, status, relationship_id) VALUES
  ('00000000-0000-0000-0000-00000000d001', 'Algebra', (SELECT v FROM ids WHERE k='tutor'), (SELECT v FROM ids WHERE k='adult'), 'Math',
     ((now() AT TIME ZONE 'America/Chicago')::date + 1 + time '15:00') AT TIME ZONE 'America/Chicago', ((now() AT TIME ZONE 'America/Chicago')::date + 1 + time '16:00') AT TIME ZONE 'America/Chicago', 'scheduled', '00000000-0000-0000-0000-00000000c001'),
  ('00000000-0000-0000-0000-00000000d002', 'Fractions', (SELECT v FROM ids WHERE k='tutor'), (SELECT v FROM ids WHERE k='kid1'), 'Math',
     ((now() AT TIME ZONE 'America/Chicago')::date + 1 + time '17:00') AT TIME ZONE 'America/Chicago', ((now() AT TIME ZONE 'America/Chicago')::date + 1 + time '18:30') AT TIME ZONE 'America/Chicago', 'scheduled', '00000000-0000-0000-0000-00000000c002');

-- ─── Resolvers ───────────────────────────────────────────────────────────
SELECT pg_temp.ok(billing_account_for((SELECT v FROM ids WHERE k='adult')) = (SELECT v FROM ids WHERE k='adult'), 'adult pays for themself');
SELECT pg_temp.ok(billing_account_for((SELECT v FROM ids WHERE k='kid1')) = (SELECT v FROM ids WHERE k='parent'), 'a child''s classes bill the parent');

SELECT pg_temp.ok((SELECT array_agg(email ORDER BY email) FROM student_notification_recipients((SELECT v FROM ids WHERE k='adult'), 'student')) = ARRAY['adult@test.dev'],
  'adult: student emails go to the adult only');
SELECT pg_temp.ok((SELECT array_agg(email ORDER BY email) FROM student_notification_recipients((SELECT v FROM ids WHERE k='adult'), 'parent_only')) = ARRAY['adult@test.dev'],
  'adult: billing emails go to the adult (unchanged)');
SELECT pg_temp.ok((SELECT array_agg(email ORDER BY email) FROM student_notification_recipients((SELECT v FROM ids WHERE k='kid1'), 'student')) = ARRAY['parent@test.dev'],
  'child without email: class emails go to the parent only, never the placeholder');
SELECT pg_temp.ok((SELECT array_agg(email ORDER BY email) FROM student_notification_recipients((SELECT v FROM ids WHERE k='kid2'), 'student')) = ARRAY['lee@example.com', 'parent@test.dev'],
  'child with email: class emails go to child and parent');
SELECT pg_temp.ok((SELECT array_agg(email ORDER BY email) FROM student_notification_recipients((SELECT v FROM ids WHERE k='kid2'), 'parent_only')) = ARRAY['parent@test.dev'],
  'child with email: billing emails go to the parent only');
SELECT pg_temp.ok((SELECT bool_and(is_guardian) FROM student_notification_recipients((SELECT v FROM ids WHERE k='kid2'), 'parent_only')),
  'parent rows are flagged is_guardian');

-- ─── Reminders RPC ───────────────────────────────────────────────────────
SELECT pg_temp.ok((SELECT count(*) FROM get_tomorrow_scheduled_classes()) = 2 AND
  (SELECT bool_and(student_id IS NOT NULL) FROM get_tomorrow_scheduled_classes()),
  'tomorrow''s classes include student_id');

-- ─── Completing a child's class charges the family balance ──────────────
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='tutor'));
SELECT pg_temp.ok((complete_class_atomic('00000000-0000-0000-0000-00000000d002', 'C1', 'Tara Tutor', 'Kim Parent', CURRENT_DATE, 'Mon', '17:00', '1.5', 'Math', 'Covered fractions', 'p.12', NULL, 1.5) ->> 'success')::boolean,
  'tutor completes the child''s class');
SELECT pg_temp.ok((SELECT "Class Cost" FROM class_logs WHERE "Class ID" = '00000000-0000-0000-0000-00000000d002') = 52.5,
  'child''s class is priced from the parent''s pack ($35/hr x 1.5)');
SELECT pg_temp.ok((complete_class_atomic('00000000-0000-0000-0000-00000000d001', 'A1', 'Tara Tutor', 'Al Adult', CURRENT_DATE, 'Mon', '15:00', '1', 'Math', '', '', NULL, 1) ->> 'success')::boolean,
  'tutor completes the adult''s class');
SELECT pg_temp.ok((SELECT "Class Cost" FROM class_logs WHERE "Class ID" = '00000000-0000-0000-0000-00000000d001') = 40,
  'adult''s class still priced from their own pack ($40/hr)');
SELECT pg_temp.as_user(NULL);

-- deduct-class-credit's ledger write: child under student_id, parent's subscription.
SELECT pg_temp.ok((apply_credit_ledger_entry((SELECT v FROM ids WHERE k='kid1'), '00000000-0000-0000-0000-00000000b002', 'debit', -1.5, 'Class completed: Fractions (1.5hrs)', '00000000-0000-0000-0000-00000000d002') ->> 'new_balance')::numeric = 6.5,
  'debit for the child computes from the family balance');
SELECT pg_temp.ok((SELECT credits_remaining FROM student_subscriptions WHERE id = '00000000-0000-0000-0000-00000000b002') = 6.5,
  'family balance updated by the sync trigger (matched by subscription id)');
SELECT apply_credit_ledger_entry((SELECT v FROM ids WHERE k='adult'), '00000000-0000-0000-0000-00000000b001', 'debit', -1, 'Class completed: Algebra (1hr)', '00000000-0000-0000-0000-00000000d001');
SELECT pg_temp.ok((SELECT credits_remaining FROM student_subscriptions WHERE id = '00000000-0000-0000-0000-00000000b001') = 3,
  'adult balance still updates (regression)');
SELECT pg_temp.ok((reverse_class_debit((SELECT v FROM ids WHERE k='kid1'), '00000000-0000-0000-0000-00000000d999', 'x') ->> 'error') = 'no_debit_found',
  'reverse_class_debit unaffected for unknown classes');

-- ─── Balance checks ──────────────────────────────────────────────────────
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='tutor'));
SELECT pg_temp.ok(get_student_credit_balance((SELECT v FROM ids WHERE k='kid1')) = 6.5, 'tutor sees the family balance for a child');
SELECT pg_temp.ok(get_student_credit_balance((SELECT v FROM ids WHERE k='adult')) = 3, 'tutor sees the adult''s own balance');
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='parent'));
SELECT pg_temp.ok(get_student_credit_balance((SELECT v FROM ids WHERE k='kid2')) = 6.5, 'parent can check a child''s balance');
DO $$ BEGIN
  PERFORM get_student_credit_balance((SELECT v FROM ids WHERE k='adult'));
  RAISE EXCEPTION 'FAIL: parent read another family''s balance';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  RAISE NOTICE 'ok - parent cannot read another student''s balance';
END $$;

-- ─── Parent read access (RLS) ────────────────────────────────────────────
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='parent'));
SET ROLE authenticated;
SELECT pg_temp.ok((SELECT count(*) FROM profiles WHERE id IN (SELECT v FROM ids WHERE k IN ('parent','kid1','kid2','tutor'))) = 4,
  'parent sees own profile, both children and the children''s tutor');
SELECT pg_temp.ok((SELECT count(*) FROM profiles WHERE id = (SELECT v FROM ids WHERE k='adult')) = 0, 'parent cannot see an unrelated student');
SELECT pg_temp.ok((SELECT count(*) FROM class_logs) = 1 AND (SELECT "Student Name" FROM class_logs) = 'Kim Parent', 'parent sees only their children''s class logs');
SELECT pg_temp.ok((SELECT count(*) FROM tutor_student_assigned) = 1, 'parent sees only their children''s tutor assignments');
SELECT pg_temp.ok((SELECT count(*) FROM students) = 2, 'parent sees only their children''s student records');
SELECT pg_temp.ok((SELECT count(*) FROM class_credits_ledger) = 2, 'parent sees the family hours history (purchase + child''s class)');
SELECT pg_temp.ok((SELECT count(*) FROM get_family_hours_history(50) WHERE student_first_name = 'Kim') = 1, 'family history names the child');
SELECT pg_temp.ok((SELECT count(*) FROM get_my_children()) = 2, 'get_my_children lists both children');
SELECT pg_temp.ok((SELECT count(*) FROM guardian_links) = 2, 'parent sees their own links');
DO $$ BEGIN
  INSERT INTO guardian_links (guardian_id, student_id, created_via) VALUES ((SELECT v FROM ids WHERE k='parent'), (SELECT v FROM ids WHERE k='adult'), 'invite');
  RAISE EXCEPTION 'FAIL: parent wrote a guardian link directly';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok - users cannot write guardian links directly';
END $$;
SELECT pg_temp.ok((update_my_child((SELECT v FROM ids WHERE k='kid1'), 'Kimmy', 'Parent', '8', '') ->> 'success')::boolean, 'parent renames a child');
SELECT pg_temp.ok((update_my_child((SELECT v FROM ids WHERE k='adult'), 'X', 'Y', '1', '') ->> 'error') = 'not_your_child', 'parent cannot edit someone else');
SELECT pg_temp.ok(get_child_calendar_feed_token((SELECT v FROM ids WHERE k='kid1')) IS NOT NULL, 'parent gets a child''s calendar link');
RESET ROLE;
SELECT pg_temp.ok((SELECT name FROM students WHERE email LIKE 'student-00000000-0000-0000-0000-000000000001%') = 'Kimmy Parent'
  AND (SELECT grade FROM students WHERE email LIKE 'student-00000000-0000-0000-0000-000000000001%') = '8',
  'child rename reaches the roster through the name sync');

SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='adult'));
SET ROLE authenticated;
SELECT pg_temp.ok((SELECT count(*) FROM profiles WHERE id IN (SELECT v FROM ids WHERE k IN ('kid1','kid2','parent'))) = 0, 'an adult cannot see the family');
SELECT pg_temp.ok((SELECT count(*) FROM class_logs) = 1 AND (SELECT "Student Name" FROM class_logs) = 'Al Adult', 'adult still sees exactly their own class log');
SELECT pg_temp.ok((SELECT count(*) FROM class_credits_ledger) = 2, 'adult still sees exactly their own hours history');
SELECT pg_temp.ok((SELECT count(*) FROM get_my_children()) = 0, 'adult has no children');
RESET ROLE;

SELECT pg_temp.as_user(NULL);
SET ROLE anon;
SELECT pg_temp.ok((SELECT count(*) FROM profiles) = 0, 'anonymous visitors see no profiles (and the new policies don''t error for them)');
RESET ROLE;

-- ─── Role changes ────────────────────────────────────────────────────────
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='adult'));
SET ROLE authenticated;
DO $$ BEGIN
  UPDATE profiles SET role = 'parent' WHERE id = auth.uid();
  RAISE EXCEPTION 'FAIL: a student with history became a parent';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  RAISE NOTICE 'ok - a student with class history cannot switch to parent (%)', SQLERRM;
END $$;
SELECT pg_temp.ok((become_family_account() ->> 'error') = 'not_eligible', 'become_family_account refuses an account with history');
RESET ROLE;

SELECT pg_temp.as_user(NULL);
INSERT INTO ids VALUES ('googleparent', pg_temp.mk('gp@test.dev', '{"full_name":"Gina Google"}'));
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='googleparent'));
SET ROLE authenticated;
SELECT pg_temp.ok((become_family_account() ->> 'success')::boolean, 'a brand-new (Google) account can become a family account');
SELECT pg_temp.ok((become_family_account() ->> 'already')::boolean, 'calling it twice is harmless');
DO $$ BEGIN
  UPDATE profiles SET role = 'student' WHERE id = auth.uid();
  RAISE EXCEPTION 'FAIL: parent switched back to student on their own';
EXCEPTION WHEN raise_exception OR insufficient_privilege OR check_violation THEN
  IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  RAISE NOTICE 'ok - a parent cannot switch themself back (%)', SQLERRM;
END $$;
RESET ROLE;
SELECT pg_temp.ok((SELECT role::text FROM profiles WHERE email = 'gp@test.dev') = 'parent'
  AND NOT EXISTS (SELECT 1 FROM students WHERE email = 'gp@test.dev'), 'converted account is a parent with no students row');

-- ─── Invite a parent: student has hours, parent has none (handover) ─────
SELECT pg_temp.as_user(NULL);
INSERT INTO ids VALUES ('teen', pg_temp.mk('teen@test.dev', '{"first_name":"Tess","last_name":"Teen"}'));
INSERT INTO student_subscriptions (id, student_id, plan_id, stripe_subscription_id, stripe_customer_id, status, credits_remaining, credits_allocated)
VALUES ('00000000-0000-0000-0000-00000000b003', (SELECT v FROM ids WHERE k='teen'), '00000000-0000-0000-0000-0000000000a1', 'purchase_teen', 'cus_teen', 'active', 0, 4);
SELECT apply_credit_ledger_entry((SELECT v FROM ids WHERE k='teen'), '00000000-0000-0000-0000-00000000b003', 'credit', 4, 'Purchased 4-Hour Pack', NULL, 'cs_teen');
INSERT INTO auto_renewal_settings (student_id, enabled, renewal_pack, threshold, stripe_customer_id)
VALUES ((SELECT v FROM ids WHERE k='teen'), true, 'basic', 1, 'cus_teen');

SELECT pg_temp.ok((create_guardian_invite((SELECT v FROM ids WHERE k='teen'), 'teen@test.dev') ->> 'error') = 'own_email', 'cannot invite yourself');
SELECT pg_temp.ok((create_guardian_invite((SELECT v FROM ids WHERE k='teen'), 'tutor@test.dev') ->> 'error') = 'email_not_eligible', 'cannot invite a tutor');
SELECT pg_temp.ok((create_guardian_invite((SELECT v FROM ids WHERE k='teen'), 'adult@test.dev') ->> 'error') = 'email_not_eligible', 'cannot invite a student with history');
SELECT pg_temp.ok((create_guardian_invite((SELECT v FROM ids WHERE k='kid1'), 'x@test.dev') ->> 'error') = 'not_eligible', 'a managed child cannot send invites');
CREATE TEMP TABLE tok (k text PRIMARY KEY, v uuid);
INSERT INTO tok VALUES ('old', (create_guardian_invite((SELECT v FROM ids WHERE k='teen'), 'Mom@Test.dev') ->> 'token')::uuid);
INSERT INTO tok VALUES ('teen', (create_guardian_invite((SELECT v FROM ids WHERE k='teen'), 'Mom@Test.dev') ->> 'token')::uuid);
SELECT pg_temp.ok((SELECT status FROM guardian_invites WHERE token = (SELECT v FROM tok WHERE k='old')) = 'cancelled', 're-inviting cancels the previous invite');

SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='teen'));
SET ROLE authenticated;
SELECT pg_temp.ok((get_my_family_status() -> 'pending_invite' ->> 'email') = 'mom@test.dev', 'student sees their pending invite');
RESET ROLE;

-- Mom signs up the ordinary way (lands as a student), then accepts.
SELECT pg_temp.as_user(NULL);
INSERT INTO ids VALUES ('mom', pg_temp.mk('mom@test.dev', '{"first_name":"Mona","last_name":"Teen"}'));
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='mom'));
SET ROLE authenticated;
SELECT pg_temp.ok((SELECT count(*) FROM get_my_pending_guardian_invites()) = 1, 'the invited parent sees the invite on their account');
RESET ROLE;
SELECT pg_temp.as_user(NULL);
SELECT pg_temp.ok((accept_guardian_invite((SELECT v FROM tok WHERE k='teen'), (SELECT v FROM ids WHERE k='adult')) ->> 'error') = 'email_mismatch', 'only the invited email can accept');
CREATE TEMP TABLE res (k text PRIMARY KEY, v jsonb);
INSERT INTO res VALUES ('teen', accept_guardian_invite((SELECT v FROM tok WHERE k='teen'), (SELECT v FROM ids WHERE k='mom')));
SELECT pg_temp.ok(((SELECT v FROM res WHERE k='teen') ->> 'success')::boolean, 'parent accepts the invite');
SELECT pg_temp.ok(((SELECT v FROM res WHERE k='teen') ->> 'stripe_customer_id') = 'cus_teen' AND NOT ((SELECT v FROM res WHERE k='teen') ->> 'merged')::boolean,
  'accept reports the moved Stripe customer');
SELECT pg_temp.ok((SELECT role::text FROM profiles WHERE id = (SELECT v FROM ids WHERE k='mom')) = 'parent'
  AND NOT EXISTS (SELECT 1 FROM students WHERE email = 'mom@test.dev'), 'the new account became a parent');
SELECT pg_temp.ok((SELECT student_id FROM student_subscriptions WHERE id = '00000000-0000-0000-0000-00000000b003') = (SELECT v FROM ids WHERE k='mom')
  AND (SELECT credits_remaining FROM student_subscriptions WHERE id = '00000000-0000-0000-0000-00000000b003') = 4,
  'the teen''s balance (4 hours) now belongs to the parent, unchanged');
SELECT pg_temp.ok((SELECT student_id FROM auto_renewal_settings WHERE stripe_customer_id = 'cus_teen') = (SELECT v FROM ids WHERE k='mom'),
  'auto-renew moved with the saved card');
SELECT pg_temp.ok(billing_account_for((SELECT v FROM ids WHERE k='teen')) = (SELECT v FROM ids WHERE k='mom'), 'the teen''s classes now bill the parent');
SELECT pg_temp.ok((SELECT array_agg(email ORDER BY email) FROM student_notification_recipients((SELECT v FROM ids WHERE k='teen'), 'student')) = ARRAY['mom@test.dev', 'teen@test.dev'],
  'linked teen: class emails to teen and parent');
SELECT pg_temp.ok((SELECT array_agg(email ORDER BY email) FROM student_notification_recipients((SELECT v FROM ids WHERE k='teen'), 'parent_only')) = ARRAY['mom@test.dev'],
  'linked teen: billing emails to the parent only');
SELECT pg_temp.ok((accept_guardian_invite((SELECT v FROM tok WHERE k='teen'), (SELECT v FROM ids WHERE k='mom')) ->> 'error') = 'invite_accepted', 'an invite works once');
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='teen'));
SET ROLE authenticated;
SELECT pg_temp.ok((get_my_family_status() -> 'guardian' ->> 'email') = 'mom@test.dev', 'teen sees who manages their hours');
SELECT pg_temp.ok((SELECT count(*) FROM class_credits_ledger) = 0, 'a student with a parent can''t read the ledger (purchases, amounts paid)');
SELECT pg_temp.ok((SELECT count(*) FROM student_subscriptions) = 0, 'a student with a parent can''t read subscriptions');
SELECT pg_temp.ok((SELECT count(*) FROM auto_renewal_settings) = 0, 'a student with a parent can''t read auto-renew settings');
SELECT pg_temp.ok((SELECT count(*) FROM get_family_hours_history(50)) = 0, 'a student gets no family history');
SELECT pg_temp.ok(get_student_credit_balance((SELECT v FROM ids WHERE k='teen')) = 4, 'the student can see the family hours remaining by default');
SELECT pg_temp.ok((set_student_hours_visibility((SELECT v FROM ids WHERE k='teen'), false) ->> 'error') = 'not_your_child', 'a student can''t change their own visibility');
RESET ROLE;

-- Hours visibility, set by the parent.
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='mom'));
SELECT pg_temp.ok((set_student_hours_visibility((SELECT v FROM ids WHERE k='teen'), false) ->> 'success')::boolean, 'the parent hides hours from the student');
SELECT pg_temp.ok((SELECT NOT hours_visible FROM get_my_children() WHERE student_id = (SELECT v FROM ids WHERE k='teen')), 'the parent''s list shows hours hidden');
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='teen'));
SELECT pg_temp.ok(get_student_credit_balance((SELECT v FROM ids WHERE k='teen')) IS NULL, 'hidden: the student gets no balance');
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='admin'));
SELECT pg_temp.ok(get_student_credit_balance((SELECT v FROM ids WHERE k='teen')) = 4, 'hidden from the student, still visible to staff');
SELECT pg_temp.as_user(NULL);
-- The teen has a class charged to the family: usage only, no purchases.
SELECT apply_credit_ledger_entry((SELECT v FROM ids WHERE k='teen'), '00000000-0000-0000-0000-00000000b003', 'debit', -1, 'Class completed: Essay (1hr)', 'teen-class-1');
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='teen'));
SET ROLE authenticated;
SELECT pg_temp.ok((SELECT count(*) FROM get_my_hours_activity(50)) = 1 AND (SELECT balance_after IS NULL FROM get_my_hours_activity(50) LIMIT 1),
  'class usage only, and no running balance while hours are hidden');
RESET ROLE;
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='mom'));
SELECT set_student_hours_visibility((SELECT v FROM ids WHERE k='teen'), true);
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='teen'));
SELECT pg_temp.ok((SELECT balance_after FROM get_my_hours_activity(50) LIMIT 1) = 3, 'visible again: usage shows the family balance');
SELECT pg_temp.as_user(NULL);

-- ─── Invite: both already have hours (merge) ────────────────────────────
SELECT pg_temp.as_user(NULL);
INSERT INTO ids VALUES ('sib', pg_temp.mk('sib@test.dev', '{"first_name":"Sam","last_name":"Parent"}'));
INSERT INTO student_subscriptions (id, student_id, plan_id, stripe_subscription_id, stripe_customer_id, status, credits_remaining, credits_allocated)
VALUES ('00000000-0000-0000-0000-00000000b004', (SELECT v FROM ids WHERE k='sib'), '00000000-0000-0000-0000-0000000000a1', 'purchase_sib', 'cus_sib', 'active', 0, 4);
SELECT apply_credit_ledger_entry((SELECT v FROM ids WHERE k='sib'), '00000000-0000-0000-0000-00000000b004', 'credit', 2.5, 'Purchased', NULL, 'cs_sib');
INSERT INTO auto_renewal_settings (student_id, enabled, renewal_pack, threshold, stripe_customer_id)
VALUES ((SELECT v FROM ids WHERE k='sib'), true, 'basic', 1, 'cus_sib');
INSERT INTO tok VALUES ('sib', (create_guardian_invite((SELECT v FROM ids WHERE k='sib'), 'parent@test.dev') ->> 'token')::uuid);
INSERT INTO res VALUES ('sib', accept_guardian_invite((SELECT v FROM tok WHERE k='sib'), (SELECT v FROM ids WHERE k='parent')));
SELECT pg_temp.ok(((SELECT v FROM res WHERE k='sib') ->> 'merged')::boolean, 'existing parent accepts: hours merge');
SELECT pg_temp.ok((SELECT credits_remaining FROM student_subscriptions WHERE id = '00000000-0000-0000-0000-00000000b002') = 9,
  'parent balance 6.5 + 2.5 moved = 9');
SELECT pg_temp.ok((SELECT credits_remaining = 0 AND status = 'cancelled' FROM student_subscriptions WHERE id = '00000000-0000-0000-0000-00000000b004'),
  'student''s old balance emptied and closed');
SELECT pg_temp.ok(NOT (SELECT enabled FROM auto_renewal_settings WHERE student_id = (SELECT v FROM ids WHERE k='sib')),
  'student''s own auto-renew switched off');
SELECT pg_temp.ok((SELECT count(*) FROM class_credits_ledger WHERE transaction_type = 'adjustment' AND student_id = (SELECT v FROM ids WHERE k='sib')) = 2,
  'the move is recorded as a matching pair of history entries');

-- Expired invites.
INSERT INTO ids VALUES ('late', pg_temp.mk('late@test.dev', '{"first_name":"Lou"}'));
INSERT INTO tok VALUES ('late', (create_guardian_invite((SELECT v FROM ids WHERE k='late'), 'parent@test.dev') ->> 'token')::uuid);
UPDATE guardian_invites SET expires_at = now() - interval '1 minute' WHERE token = (SELECT v FROM tok WHERE k='late');
SELECT pg_temp.ok((accept_guardian_invite((SELECT v FROM tok WHERE k='late'), (SELECT v FROM ids WHERE k='parent')) ->> 'error') = 'invite_expired', 'expired invites can''t be accepted');

-- ─── Admin: unlink ───────────────────────────────────────────────────────
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='admin'));
SELECT pg_temp.ok((admin_unlink_guardian((SELECT v FROM ids WHERE k='kid1')) ->> 'error') = 'managed_student', 'a managed child can''t be unlinked');
SELECT pg_temp.ok((admin_unlink_guardian((SELECT v FROM ids WHERE k='sib')) ->> 'success')::boolean, 'admin unlinks a student with their own login');
SELECT pg_temp.ok(billing_account_for((SELECT v FROM ids WHERE k='sib')) = (SELECT v FROM ids WHERE k='sib'), 'after unlinking the student pays for themself again');
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='sib'));
SET ROLE authenticated;
SELECT pg_temp.ok((SELECT count(*) FROM class_credits_ledger) > 0, 'after unlinking the student reads their own history again');
RESET ROLE;
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='admin'));
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='parent'));
DO $$ BEGIN
  PERFORM admin_unlink_guardian((SELECT v FROM ids WHERE k='kid2'));
  RAISE EXCEPTION 'FAIL: non-admin unlinked';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  RAISE NOTICE 'ok - only admins can unlink';
END $$;

-- ─── Admin dashboards ────────────────────────────────────────────────────
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='admin'));
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM get_at_risk_students() WHERE profile_id = (SELECT v FROM ids WHERE k='mom')),
  'at-risk list includes a family with no recent classes');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM get_at_risk_students() WHERE profile_id = (SELECT v FROM ids WHERE k='parent')),
  'a parent whose child just had a class is not at risk');

-- ─── Admin: convert an existing account into a family ───────────────────
SELECT pg_temp.as_user(NULL);
INSERT INTO ids VALUES ('legacy', pg_temp.mk('kai.parent@test.dev', '{"first_name":"Kai","last_name":"Giorgio"}'));
UPDATE students SET grade = '9', payment_method = 'stripe', subjects = '{Math}' WHERE email = 'kai.parent@test.dev';
UPDATE profiles SET timezone = 'America/New_York' WHERE email = 'kai.parent@test.dev';
INSERT INTO student_subscriptions (id, student_id, plan_id, stripe_subscription_id, stripe_customer_id, status, credits_remaining, credits_allocated)
VALUES ('00000000-0000-0000-0000-00000000b005', (SELECT v FROM ids WHERE k='legacy'), '00000000-0000-0000-0000-0000000000a1', 'purchase_legacy', 'cus_legacy', 'active', 0, 4);
SELECT apply_credit_ledger_entry((SELECT v FROM ids WHERE k='legacy'), '00000000-0000-0000-0000-00000000b005', 'credit', 4, 'Purchased', NULL, 'cs_legacy');
INSERT INTO tutor_student_assigned (id, tutor_id, student_id, active, subject) VALUES
  ('00000000-0000-0000-0000-00000000c005', (SELECT v FROM ids WHERE k='tutor'), (SELECT v FROM ids WHERE k='legacy'), true, 'Math');
INSERT INTO scheduled_classes (id, title, tutor_id, student_id, subject, start_at, end_at, status, relationship_id) VALUES
  ('00000000-0000-0000-0000-00000000d005', 'Geometry', (SELECT v FROM ids WHERE k='tutor'), (SELECT v FROM ids WHERE k='legacy'), 'Math',
     now() + interval '3 days', now() + interval '3 days 1 hour', 'scheduled', '00000000-0000-0000-0000-00000000c005');
INSERT INTO class_logs ("Class Number", "Tutor Name", "Student Name", "Date", "Subject", "Class ID", student_user_id, tutor_user_id)
VALUES ('L1', 'Tara Tutor', 'Kai Giorgio', CURRENT_DATE - 7, 'Math', 'old-class', (SELECT v FROM ids WHERE k='legacy'), (SELECT v FROM ids WHERE k='tutor'));

SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='tutor'));
DO $$ BEGIN
  PERFORM convert_account_to_family((SELECT v FROM ids WHERE k='legacy'), NULL, NULL, NULL, true);
  RAISE EXCEPTION 'FAIL: non-admin ran the conversion';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  RAISE NOTICE 'ok - only admins can convert accounts';
END $$;
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='admin'));
INSERT INTO res VALUES ('dry', convert_account_to_family((SELECT v FROM ids WHERE k='legacy'), NULL, NULL, NULL, true));
SELECT pg_temp.ok(((SELECT v FROM res WHERE k='dry') -> 'would_move' ->> 'scheduled_classes')::int = 1
  AND ((SELECT v FROM res WHERE k='dry') -> 'would_move' ->> 'class_logs')::int = 1
  AND NOT EXISTS (SELECT 1 FROM guardian_links WHERE guardian_id = (SELECT v FROM ids WHERE k='legacy')),
  'dry run counts what would move and changes nothing');

SELECT pg_temp.as_user(NULL);
INSERT INTO ids VALUES ('kai', pg_temp.mk('student-00000000-0000-0000-0000-000000000005@managed.learn2lead.page', '{"first_name":"Kai","last_name":"Giorgio"}'));
SELECT pg_temp.as_user((SELECT v FROM ids WHERE k='admin'));
INSERT INTO res VALUES ('conv', convert_account_to_family((SELECT v FROM ids WHERE k='legacy'), (SELECT v FROM ids WHERE k='kai'), 'Maria', 'Giorgio', false));
SELECT pg_temp.ok(((SELECT v FROM res WHERE k='conv') ->> 'success')::boolean, 'conversion succeeds');
SELECT pg_temp.ok((SELECT role::text || ' ' || first_name FROM profiles WHERE id = (SELECT v FROM ids WHERE k='legacy')) = 'parent Maria',
  'the login is now the parent, renamed');
SELECT pg_temp.ok((SELECT student_id FROM scheduled_classes WHERE id = '00000000-0000-0000-0000-00000000d005') = (SELECT v FROM ids WHERE k='kai')
  AND (SELECT student_id FROM tutor_student_assigned WHERE id = '00000000-0000-0000-0000-00000000c005') = (SELECT v FROM ids WHERE k='kai'),
  'classes and tutor assignment moved to the child');
SELECT pg_temp.ok((SELECT student_user_id = (SELECT v FROM ids WHERE k='kai') AND "Student Name" = 'Kai Giorgio' FROM class_logs WHERE "Class ID" = 'old-class'),
  'class history moved to the child');
SELECT pg_temp.ok((SELECT grade = '9' AND payment_method = 'stripe' AND subjects = '{Math}' FROM students WHERE email LIKE 'student-00000000-0000-0000-0000-000000000005%')
  AND NOT EXISTS (SELECT 1 FROM students WHERE email = 'kai.parent@test.dev'),
  'student details moved to the child; the parent has no students row');
SELECT pg_temp.ok((SELECT managed AND timezone = 'America/New_York' FROM profiles WHERE id = (SELECT v FROM ids WHERE k='kai')), 'child is managed and keeps the time zone');
SELECT pg_temp.ok((SELECT student_id FROM student_subscriptions WHERE id = '00000000-0000-0000-0000-00000000b005') = (SELECT v FROM ids WHERE k='legacy')
  AND billing_account_for((SELECT v FROM ids WHERE k='kai')) = (SELECT v FROM ids WHERE k='legacy'),
  'balance stays on the login, which now pays for the child');

