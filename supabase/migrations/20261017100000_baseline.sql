-- Baseline: the production database schema as of 2026-10-17.
--
-- The earlier migrations (kept for reference in supabase/migrations_archive/)
-- can't rebuild a database on their own: some tables were first created in
-- the Supabase dashboard. This file is the full schema instead, taken from
-- production with `supabase db dump` after migration 20261017000003, plus
-- the objects that live in Supabase-managed schemas (the sign-up trigger on
-- auth.users, storage buckets and storage access rules).
--
-- Production already has all of this: its migration history records this
-- version as applied, so `supabase db push` never runs it there. Fresh
-- databases (`supabase start`, CI) start from here.
--
-- Not included, production-only: pg_cron schedules (supabase/cron/jobs.sql;
-- they call the production functions) and Vault secrets.

-- Supabase gives new objects default grants (e.g. EXECUTE to anon). Pause
-- them so the explicit grants below reproduce production's permissions
-- exactly; the dump re-establishes the defaults at the end.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'student',
    'tutor',
    'admin',
    'parent'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."communication_style" AS ENUM (
    'encouraging',
    'direct',
    'balanced'
);


ALTER TYPE "public"."communication_style" OWNER TO "postgres";


CREATE TYPE "public"."learning_pace" AS ENUM (
    'slow',
    'moderate',
    'fast'
);


ALTER TYPE "public"."learning_pace" OWNER TO "postgres";


CREATE TYPE "public"."session_structure" AS ENUM (
    'structured',
    'flexible',
    'mixed'
);


ALTER TYPE "public"."session_structure" OWNER TO "postgres";


CREATE TYPE "public"."student_goal" AS ENUM (
    'catch_up',
    'maintain',
    'get_ahead',
    'test_prep'
);


ALTER TYPE "public"."student_goal" OWNER TO "postgres";


CREATE TYPE "public"."teaching_style" AS ENUM (
    'visual',
    'verbal',
    'hands_on',
    'mixed'
);


ALTER TYPE "public"."teaching_style" OWNER TO "postgres";


CREATE TYPE "public"."tutor_specialty" AS ENUM (
    'struggling',
    'maintaining',
    'advanced',
    'all'
);


ALTER TYPE "public"."tutor_specialty" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_guardian_invite"("p_token" "uuid", "p_guardian_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."accept_guardian_invite"("p_token" "uuid", "p_guardian_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_unlink_guardian"("p_student_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_unlink_guardian"("p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_credit_ledger_entry"("p_student_id" "uuid", "p_subscription_id" "uuid", "p_transaction_type" "text", "p_amount" numeric, "p_reason" "text", "p_related_class_id" "text" DEFAULT NULL::"text", "p_invoice_id" "text" DEFAULT NULL::"text", "p_dollar_amount" numeric DEFAULT NULL::numeric, "p_allow_negative" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current numeric(6,2);
  v_new numeric(6,2);
  v_ledger_id uuid;
  v_existing_id uuid;
  v_existing_balance numeric(6,2);
BEGIN
  IF p_invoice_id IS NOT NULL THEN
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
    FROM public.class_credits_ledger
    WHERE invoice_id = p_invoice_id;

    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'idempotent', true, 'ledger_id', v_existing_id, 'new_balance', v_existing_balance);
    END IF;
  END IF;

  IF p_related_class_id IS NOT NULL AND p_transaction_type = 'debit' THEN
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
    FROM public.class_credits_ledger
    WHERE related_class_id = p_related_class_id AND transaction_type = 'debit';

    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'idempotent', true, 'ledger_id', v_existing_id, 'new_balance', v_existing_balance);
    END IF;
  END IF;

  SELECT credits_remaining INTO v_current
  FROM public.student_subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'subscription_not_found');
  END IF;

  v_new := v_current + p_amount;

  IF NOT p_allow_negative AND v_new < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits', 'current_balance', v_current);
  END IF;

  INSERT INTO public.class_credits_ledger (
    student_id, subscription_id, transaction_type, amount,
    balance_after, reason, related_class_id, invoice_id, dollar_amount
  ) VALUES (
    p_student_id, p_subscription_id, p_transaction_type, p_amount,
    v_new, p_reason, p_related_class_id, p_invoice_id, p_dollar_amount
  )
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object('success', true, 'idempotent', false, 'ledger_id', v_ledger_id, 'new_balance', v_new);

EXCEPTION WHEN unique_violation THEN
  IF p_invoice_id IS NOT NULL THEN
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
    FROM public.class_credits_ledger WHERE invoice_id = p_invoice_id;
  ELSE
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
    FROM public.class_credits_ledger
    WHERE related_class_id = p_related_class_id AND transaction_type = 'debit';
  END IF;
  RETURN jsonb_build_object('success', true, 'idempotent', true, 'ledger_id', v_existing_id, 'new_balance', v_existing_balance);
END;
$$;


ALTER FUNCTION "public"."apply_credit_ledger_entry"("p_student_id" "uuid", "p_subscription_id" "uuid", "p_transaction_type" "text", "p_amount" numeric, "p_reason" "text", "p_related_class_id" "text", "p_invoice_id" "text", "p_dollar_amount" numeric, "p_allow_negative" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_create_class_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    IF NOT EXISTS (SELECT 1 FROM public.class_logs WHERE "Class ID" = NEW.id::text) THEN
      INSERT INTO public.class_logs (
        "Class Number", "Tutor Name", "Student Name",
        "Date", "Day", "Time (CST)", "Time (hrs)",
        "Subject", "Content", "HW", "Class ID",
        "Additional Info",
        tutor_user_id, student_user_id
      )
      SELECT 
        NEW.title,
        COALESCE(tp.first_name || ' ' || tp.last_name, tp.email, 'Unknown Tutor'),
        COALESCE(sp.first_name || ' ' || sp.last_name, sp.email, 'Unknown Student'),
        NEW.date, to_char(NEW.date, 'Day'), NEW.start_time::text,
        EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))/3600,
        NEW.subject, NEW.notes, NULL, NEW.id::text,
        CASE WHEN NEW.attendance IS NOT NULL THEN 'Attendance: ' || NEW.attendance ELSE NULL END,
        NEW.tutor_id, NEW.student_id
      FROM public.profiles tp, public.profiles sp
      WHERE tp.id = NEW.tutor_id AND sp.id = NEW.student_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_create_class_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_sync_user_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.role = 'student' THEN
    IF NOT EXISTS (SELECT 1 FROM students WHERE email = NEW.email) THEN
      INSERT INTO students (
        name,
        email,
        subjects,
        grade,
        enrollment_date,
        active
      ) VALUES (
        CASE
          WHEN TRIM(COALESCE(NEW.first_name, '')) != '' OR TRIM(COALESCE(NEW.last_name, '')) != '' THEN
            TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')))
          ELSE
            NEW.email
        END,
        NEW.email,
        '{}',
        'Not specified',
        CURRENT_DATE,
        true
      );
    END IF;

    DELETE FROM tutors WHERE email = NEW.email;

  ELSIF NEW.role = 'tutor' THEN
    IF NOT EXISTS (SELECT 1 FROM tutors WHERE email = NEW.email) THEN
      INSERT INTO tutors (
        name,
        email,
        subjects,
        hourly_rate,
        active
      ) VALUES (
        CASE
          WHEN TRIM(COALESCE(NEW.first_name, '')) != '' OR TRIM(COALESCE(NEW.last_name, '')) != '' THEN
            TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')))
          ELSE
            NEW.email
        END,
        NEW.email,
        '{}',
        25,
        true
      );
    END IF;

    DELETE FROM students WHERE email = NEW.email;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_sync_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."become_family_account"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."become_family_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."billing_account_for"("p_student_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(public.guardian_of(p_student_id), p_student_id);
$$;


ALTER FUNCTION "public"."billing_account_for"("p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_message_pair"("p_student_id" "uuid", "p_tutor_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."can_message_pair"("p_student_id" "uuid", "p_tutor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_class_file"("p_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL AND (
    get_auth_user_role() = 'admin'
    OR split_part(p_name, '/', 1) = auth.uid()::text
    OR public.is_class_participant(public.class_id_from_file_path(p_name))
    OR EXISTS (
      SELECT 1 FROM public.class_uploads cu
      WHERE cu.file_path = p_name AND public.is_class_participant(cu.class_id)
    )
  );
$$;


ALTER FUNCTION "public"."can_read_class_file"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_shared_file"("p_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL AND (
    get_auth_user_role() = 'admin'
    OR split_part(p_name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.content_shares cs
      WHERE cs.file_path = p_name AND auth.uid() IN (cs.sender_id, cs.receiver_id)
    )
  );
$$;


ALTER FUNCTION "public"."can_read_shared_file"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_thread"("p_thread_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id = p_thread_id
      AND (
        auth.uid() IN (t.student_id, t.tutor_id)
        OR public.is_guardian_of(t.student_id)
        OR get_auth_user_role() = 'admin'
      )
  );
$$;


ALTER FUNCTION "public"."can_view_thread"("p_thread_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_write_class_file"("p_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL AND (
    get_auth_user_role() = 'admin'
    OR split_part(p_name, '/', 1) = auth.uid()::text
    OR public.is_class_participant(public.class_id_from_file_path(p_name), false)
  );
$$;


ALTER FUNCTION "public"."can_write_class_file"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_my_guardian_invite"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.guardian_invites
  SET status = 'cancelled'
  WHERE student_id = auth.uid() AND status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'cancelled', v_count);
END;
$$;


ALTER FUNCTION "public"."cancel_my_guardian_invite"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_username"("p_username" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."check_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_message_alerts"("p_message_id" "uuid") RETURNS TABLE("profile_id" "uuid", "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."claim_message_alerts"("p_message_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_id_from_file_path"("p_name" "text") RETURNS "uuid"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $_$
  SELECT CASE
    WHEN parts[1] = 'class_uploads' AND parts[2] ~* '^[0-9a-f-]{36}$' THEN parts[2]::uuid
    WHEN array_length(parts, 1) > 1 AND parts[1] ~* '^[0-9a-f-]{36}$' THEN parts[1]::uuid
  END
  FROM (SELECT string_to_array(p_name, '/') AS parts) p;
$_$;


ALTER FUNCTION "public"."class_id_from_file_path"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_must_change_password"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.profiles SET must_change_password = false, updated_at = now()
  WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."clear_must_change_password"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_class_atomic"("p_class_id" "uuid", "p_class_number" "text", "p_tutor_name" "text", "p_student_name" "text", "p_date" "date", "p_day" "text", "p_time_cst" "text", "p_time_hrs" "text", "p_subject" "text", "p_content" "text", "p_hw" "text", "p_additional_info" "text", "p_credits_charged" numeric DEFAULT NULL::numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."complete_class_atomic"("p_class_id" "uuid", "p_class_number" "text", "p_tutor_name" "text", "p_student_name" "text", "p_date" "date", "p_day" "text", "p_time_cst" "text", "p_time_hrs" "text", "p_subject" "text", "p_content" "text", "p_hw" "text", "p_additional_info" "text", "p_credits_charged" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_account_to_family"("p_account_id" "uuid", "p_child_id" "uuid", "p_parent_first_name" "text", "p_parent_last_name" "text", "p_dry_run" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."convert_account_to_family"("p_account_id" "uuid", "p_child_id" "uuid", "p_parent_first_name" "text", "p_parent_last_name" "text", "p_dry_run" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_guardian_invite"("p_student_id" "uuid", "p_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
$_$;


ALTER FUNCTION "public"."create_guardian_invite"("p_student_id" "uuid", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."demote_tutor_to_student"("tutor_user_id" "uuid", "reason" "text" DEFAULT 'Admin demotion'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_profile RECORD;
  current_admin_id UUID;
  current_admin_role TEXT;
  active_students_count INTEGER;
  result jsonb;
BEGIN
  -- Get current user ID and role with explicit checks
  current_admin_id := auth.uid();
  
  IF current_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required - please log in again',
      'code', 'NOT_AUTHENTICATED'
    );
  END IF;
  
  -- Get current user role
  SELECT role INTO current_admin_role FROM profiles WHERE id = current_admin_id;
  
  IF current_admin_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found - please refresh and try again',
      'code', 'PROFILE_NOT_FOUND'
    );
  END IF;
  
  IF current_admin_role != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only admins can demote users',
      'code', 'PERMISSION_DENIED'
    );
  END IF;
  
  -- Get target user profile
  SELECT * INTO current_profile FROM profiles WHERE id = tutor_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'code', 'USER_NOT_FOUND'
    );
  END IF;
  
  IF current_profile.role != 'tutor' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is not a tutor',
      'code', 'INVALID_ROLE'
    );
  END IF;
  
  -- Check for active student assignments
  SELECT COUNT(*) INTO active_students_count
  FROM tutor_student_assigned 
  WHERE tutor_id = tutor_user_id AND active = true;
  
  IF active_students_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot demote tutor with active student assignments',
      'code', 'HAS_ACTIVE_STUDENTS',
      'active_students', active_students_count
    );
  END IF;
  
  BEGIN
    -- Update profile role
    UPDATE profiles 
    SET role = 'student', updated_at = now()
    WHERE id = tutor_user_id;
    
    -- Log the demotion with explicit admin ID
    INSERT INTO role_change_audit (
      user_id, old_role, new_role, changed_by, reason
    ) VALUES (
      tutor_user_id, 'tutor', 'student', current_admin_id, reason
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User successfully demoted to student',
      'user_id', tutor_user_id
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'DEMOTION_FAILED',
        'details', SQLSTATE
      );
  END;
END;
$$;


ALTER FUNCTION "public"."demote_tutor_to_student"("tutor_user_id" "uuid", "reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_class_logs_update_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_role text := get_auth_user_role();
BEGIN
  IF v_role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF v_role = 'tutor' THEN
    IF NEW."Date" IS DISTINCT FROM OLD."Date"
      OR NEW."Day" IS DISTINCT FROM OLD."Day"
      OR NEW."Time (CST)" IS DISTINCT FROM OLD."Time (CST)"
      OR NEW."Time (hrs)" IS DISTINCT FROM OLD."Time (hrs)"
      OR NEW."Student Name" IS DISTINCT FROM OLD."Student Name"
      OR NEW."Tutor Name" IS DISTINCT FROM OLD."Tutor Name"
      OR NEW."Subject" IS DISTINCT FROM OLD."Subject"
      OR NEW."Title" IS DISTINCT FROM OLD."Title"
      OR NEW."Additional Info" IS DISTINCT FROM OLD."Additional Info"
      OR NEW."Class ID" IS DISTINCT FROM OLD."Class ID"
      OR NEW."Class Number" IS DISTINCT FROM OLD."Class Number"
      OR NEW."Class Cost" IS DISTINCT FROM OLD."Class Cost"
      OR NEW."Tutor Cost" IS DISTINCT FROM OLD."Tutor Cost"
      OR NEW.student_payment_date IS DISTINCT FROM OLD.student_payment_date
      OR NEW.tutor_payment_date IS DISTINCT FROM OLD.tutor_payment_date
      OR NEW.tutor_is_paid IS DISTINCT FROM OLD.tutor_is_paid
      OR NEW.student_user_id IS DISTINCT FROM OLD.student_user_id
      OR NEW.tutor_user_id IS DISTINCT FROM OLD.tutor_user_id
      OR NEW.student_rating IS DISTINCT FROM OLD.student_rating
      OR NEW.student_feedback IS DISTINCT FROM OLD.student_feedback
      OR NEW.verified_by_student IS DISTINCT FROM OLD.verified_by_student
      OR NEW.verification_deadline IS DISTINCT FROM OLD.verification_deadline
      OR NEW.start_at IS DISTINCT FROM OLD.start_at
      OR NEW.timezone IS DISTINCT FROM OLD.timezone
    THEN
      RAISE EXCEPTION 'Tutors may only edit the Content and HW fields on a class log';
    END IF;
    RETURN NEW;
  END IF;

  IF v_role = 'student' THEN
    IF NEW."Content" IS DISTINCT FROM OLD."Content"
      OR NEW."HW" IS DISTINCT FROM OLD."HW"
      OR NEW."Date" IS DISTINCT FROM OLD."Date"
      OR NEW."Day" IS DISTINCT FROM OLD."Day"
      OR NEW."Time (CST)" IS DISTINCT FROM OLD."Time (CST)"
      OR NEW."Time (hrs)" IS DISTINCT FROM OLD."Time (hrs)"
      OR NEW."Student Name" IS DISTINCT FROM OLD."Student Name"
      OR NEW."Tutor Name" IS DISTINCT FROM OLD."Tutor Name"
      OR NEW."Title" IS DISTINCT FROM OLD."Title"
      OR NEW."Class Cost" IS DISTINCT FROM OLD."Class Cost"
      OR NEW."Tutor Cost" IS DISTINCT FROM OLD."Tutor Cost"
      OR NEW.student_payment_date IS DISTINCT FROM OLD.student_payment_date
      OR NEW.tutor_payment_date IS DISTINCT FROM OLD.tutor_payment_date
      OR NEW.tutor_is_paid IS DISTINCT FROM OLD.tutor_is_paid
      OR NEW.student_user_id IS DISTINCT FROM OLD.student_user_id
      OR NEW.tutor_user_id IS DISTINCT FROM OLD.tutor_user_id
      OR NEW.verified_by_student IS DISTINCT FROM OLD.verified_by_student
      OR NEW.verification_deadline IS DISTINCT FROM OLD.verification_deadline
      OR NEW.start_at IS DISTINCT FROM OLD.start_at
      OR NEW.timezone IS DISTINCT FROM OLD.timezone
    THEN
      RAISE EXCEPTION 'Students may only edit their rating, feedback, and dispute report on a class log';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to update class logs directly';
END;
$$;


ALTER FUNCTION "public"."enforce_class_logs_update_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_class_notifications"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  upcoming_class RECORD;
BEGIN
  FOR upcoming_class IN 
    SELECT 
      sc.id,
      sc.title,
      sc.date,
      sc.start_time,
      sc.tutor_id,
      sc.student_id
    FROM 
      public.scheduled_classes sc
    WHERE 
      sc.date = CURRENT_DATE
      AND sc.start_time::time - CURRENT_TIME BETWEEN interval '14 minutes' AND interval '16 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n 
        WHERE n.related_id = sc.id 
        AND n.type = 'class_reminder'
      )
  LOOP
    INSERT INTO public.notifications (user_id, message, type, related_id)
    VALUES (
      upcoming_class.tutor_id,
      'Class "' || upcoming_class.title || '" starts in 15 minutes.',
      'class_reminder',
      upcoming_class.id
    );
    
    INSERT INTO public.notifications (user_id, message, type, related_id)
    VALUES (
      upcoming_class.student_id,
      'Your class "' || upcoming_class.title || '" starts in 15 minutes.',
      'class_reminder',
      upcoming_class.id
    );
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."generate_class_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_username"("p_first" "text", "p_last" "text", "p_email" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_username"("p_first" "text", "p_last" "text", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_at_risk_students"() RETURNS TABLE("student_name" "text", "profile_id" "uuid", "email" "text", "credits_remaining" numeric, "last_class_date" "date", "days_since_class" integer)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_at_risk_students"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_user_display_name"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    CASE
      WHEN TRIM(COALESCE(first_name, '')) != '' OR TRIM(COALESCE(last_name, '')) != ''
      THEN TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
      ELSE email
    END
  FROM public.profiles
  WHERE id = auth.uid()
$$;


ALTER FUNCTION "public"."get_auth_user_display_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_user_email"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT email FROM public.profiles WHERE id = auth.uid()
$$;


ALTER FUNCTION "public"."get_auth_user_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_auth_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_child_calendar_feed_token"("p_student_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_child_calendar_feed_token"("p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_class_log_totals"("p_search" "text" DEFAULT NULL::"text", "p_date" "date" DEFAULT NULL::"date", "p_payment_filter" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result jsonb;
BEGIN
  IF get_auth_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT jsonb_build_object(
    'total_class_cost', COALESCE(SUM("Class Cost"), 0),
    'total_tutor_cost', COALESCE(SUM("Tutor Cost"), 0),
    'pending_student', COALESCE(SUM(CASE WHEN student_payment_date IS NULL THEN "Class Cost" ELSE 0 END), 0),
    'pending_tutor', COALESCE(SUM(CASE WHEN tutor_payment_date IS NULL THEN "Tutor Cost" ELSE 0 END), 0),
    'total_count', COUNT(*)
  ) INTO result
  FROM public.class_logs
  WHERE
    (p_date IS NULL OR "Date" = p_date)
    AND (p_payment_filter IS NULL OR
      (p_payment_filter = 'student_unpaid' AND student_payment_date IS NULL) OR
      (p_payment_filter = 'student_paid' AND student_payment_date IS NOT NULL) OR
      (p_payment_filter = 'tutor_unpaid' AND tutor_payment_date IS NULL) OR
      (p_payment_filter = 'tutor_paid' AND tutor_payment_date IS NOT NULL)
    )
    AND (p_search IS NULL OR (
      "Class Number" ILIKE '%' || p_search || '%' OR
      "Tutor Name" ILIKE '%' || p_search || '%' OR
      "Student Name" ILIKE '%' || p_search || '%' OR
      "Subject" ILIKE '%' || p_search || '%' OR
      "Title" ILIKE '%' || p_search || '%'
    ));

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_class_log_totals"("p_search" "text", "p_date" "date", "p_payment_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_family_hours_history"("p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "transaction_type" "text", "amount" numeric, "balance_after" numeric, "reason" "text", "student_id" "uuid", "student_first_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT l.id, l.created_at, l.transaction_type, l.amount, l.balance_after, l.reason,
         l.student_id, p.first_name
  FROM public.class_credits_ledger l
  JOIN public.student_subscriptions ss ON ss.id = l.subscription_id
  LEFT JOIN public.profiles p ON p.id = l.student_id
  WHERE ss.student_id = auth.uid()
    AND public.get_auth_user_role() = 'parent'
  ORDER BY l.created_at DESC, l.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;


ALTER FUNCTION "public"."get_family_hours_history"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_messageable_pairs"() RETURNS TABLE("student_id" "uuid", "student_name" "text", "tutor_id" "uuid", "tutor_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_messageable_pairs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_calendar_feed_token"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_token uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.calendar_feed_tokens (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT token INTO v_token
  FROM public.calendar_feed_tokens
  WHERE user_id = auth.uid();

  RETURN v_token;
END;
$$;


ALTER FUNCTION "public"."get_my_calendar_feed_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_children"() RETURNS TABLE("student_id" "uuid", "first_name" "text", "last_name" "text", "grade" "text", "notification_email" "text", "timezone" "text", "managed" boolean, "linked_at" timestamp with time zone, "hours_visible" boolean, "username" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT p.id, p.first_name, p.last_name, s.grade,
         CASE WHEN p.managed THEN p.notification_email ELSE p.email END,
         p.timezone, p.managed, gl.created_at, NOT p.hide_hours_from_student, p.username
  FROM public.guardian_links gl
  JOIN public.profiles p ON p.id = gl.student_id
  LEFT JOIN public.students s ON lower(s.email) = lower(p.email)
  WHERE gl.guardian_id = auth.uid()
  ORDER BY gl.created_at, p.first_name;
$$;


ALTER FUNCTION "public"."get_my_children"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_family_status"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_my_family_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_hours_activity"("p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "amount" numeric, "reason" "text", "balance_after" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT l.id, l.created_at, l.amount, l.reason,
         CASE WHEN me.hide_hours_from_student THEN NULL ELSE l.balance_after END
  FROM public.class_credits_ledger l
  JOIN public.profiles me ON me.id = auth.uid()
  WHERE l.student_id = auth.uid()
    AND (l.transaction_type = 'debit' OR l.reversed_debit_id IS NOT NULL)
  ORDER BY l.created_at DESC, l.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;


ALTER FUNCTION "public"."get_my_hours_activity"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_payroll_history"() RETURNS TABLE("id" "uuid", "paid_at" "date", "amount_paid" numeric, "class_count" integer, "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    pr.id,
    pr.paid_at,
    pr.amount_paid,
    pr.class_count,
    pr.created_at
  FROM public.tutor_payroll_runs pr
  WHERE pr.tutor_user_id = auth.uid()
  ORDER BY pr.created_at DESC
  LIMIT 50;
$$;


ALTER FUNCTION "public"."get_my_payroll_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_pending_guardian_invites"() RETURNS TABLE("token" "uuid", "student_first_name" "text", "student_last_name" "text", "created_at" timestamp with time zone, "expires_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT gi.token, s.first_name, s.last_name, gi.created_at, gi.expires_at
  FROM public.guardian_invites gi
  JOIN public.profiles me ON me.id = auth.uid()
  JOIN public.profiles s ON s.id = gi.student_id
  WHERE gi.status = 'pending'
    AND gi.expires_at > now()
    AND gi.email = lower(me.email)
  ORDER BY gi.created_at;
$$;


ALTER FUNCTION "public"."get_my_pending_guardian_invites"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_threads"() RETURNS TABLE("thread_id" "uuid", "student_id" "uuid", "student_name" "text", "tutor_id" "uuid", "tutor_name" "text", "last_message_at" timestamp with time zone, "last_message_preview" "text", "last_sender_name" "text", "unread_count" bigint, "can_post" boolean, "my_role" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_my_threads"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_thread"("p_student_id" "uuid", "p_tutor_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_or_create_thread"("p_student_id" "uuid", "p_tutor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_referral_code"("p_code" "text") RETURNS TABLE("code" "text", "discount_amount" numeric, "discount_type" "text", "active" boolean, "expires_at" timestamp with time zone, "max_uses" integer, "times_used" integer, "referrer_first_name" "text", "referrer_last_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    rc.code,
    rc.discount_amount,
    rc.discount_type,
    rc.active,
    rc.expires_at,
    rc.max_uses,
    rc.times_used,
    p.first_name,
    p.last_name
  FROM referral_codes rc
  LEFT JOIN profiles p ON p.id = rc.created_by
  WHERE rc.code = upper(p_code);
$$;


ALTER FUNCTION "public"."get_public_referral_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_referral_usage_stats"("p_user_id" "uuid") RETURNS TABLE("times_used" bigint, "hours_earned" numeric, "latest_usage" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    COUNT(*) as times_used,
    COUNT(*) * 1.0 as hours_earned,
    MAX(ru.used_at) as latest_usage
  FROM referral_usage ru
  JOIN referral_codes rc ON rc.id = ru.referral_code_id
  WHERE rc.created_by = p_user_id
    AND (p_user_id = auth.uid() OR get_auth_user_role() = 'admin');
$$;


ALTER FUNCTION "public"."get_referral_usage_stats"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_classes"("requesting_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS TABLE("id" "uuid", "student_id" "uuid", "tutor_id" "uuid", "date" "date", "title" "text", "start_time" time without time zone, "end_time" time without time zone, "zoom_link" "text", "subject" "text", "notes" "text", "status" "text", "attendance" "text", "tutor_name" "text", "student_name" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if user has proper permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = requesting_user_id 
    AND role IN ('admin', 'tutor', 'student')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
      sc.id,
      sc.student_id,
      sc.tutor_id,
      sc.date,
      sc.title,
      sc.start_time,
      sc.end_time,
      sc.zoom_link,
      sc.subject,
      sc.notes,
      sc.status,
      sc.attendance,
      COALESCE(tp.first_name || ' ' || tp.last_name, tp.email) as tutor_name,
      COALESCE(sp.first_name || ' ' || sp.last_name, sp.email) as student_name
  FROM public.scheduled_classes sc
  LEFT JOIN public.profiles tp ON sc.tutor_id = tp.id
  LEFT JOIN public.profiles sp ON sc.student_id = sp.id
  WHERE 
    CASE 
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'admin' THEN true
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'tutor' THEN sc.tutor_id = requesting_user_id
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'student' THEN sc.student_id = requesting_user_id
      ELSE false
    END;
END;
$$;


ALTER FUNCTION "public"."get_student_classes"("requesting_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_credit_balance"("p_student_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    IF auth.uid() = p_student_id
       AND (SELECT hide_hours_from_student FROM public.profiles WHERE id = p_student_id)
    THEN
      RETURN NULL;
    END IF;
    SELECT credits_remaining INTO v_balance
    FROM student_subscriptions
    WHERE student_id = v_billing AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  RETURN COALESCE(v_balance, 0);
END;
$$;


ALTER FUNCTION "public"."get_student_credit_balance"("p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_login_status"("p_student_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_student_login_status"("p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_students_credit_summary"() RETURNS TABLE("student_name" "text", "profile_id" "uuid", "credits" numeric, "last_class_date" "date")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_students_credit_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_thread_messages"("p_thread_id" "uuid", "p_limit" integer DEFAULT 200) RETURNS TABLE("id" "uuid", "sender_id" "uuid", "sender_name" "text", "sender_role" "text", "body" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_thread_messages"("p_thread_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_thread_participants"("p_thread_id" "uuid") RETURNS TABLE("profile_id" "uuid", "name" "text", "role" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_thread_participants"("p_thread_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tomorrow_scheduled_classes"() RETURNS TABLE("class_id" "uuid", "title" "text", "subject" "text", "class_date" "date", "class_start" time without time zone, "start_at" timestamp with time zone, "end_at" timestamp with time zone, "student_name" "text", "student_email" "text", "student_timezone" "text", "tutor_name" "text", "tutor_email" "text", "tutor_timezone" "text", "zoom_link" "text", "student_notify_reminders" boolean, "tutor_notify_reminders" boolean, "student_id" "uuid", "tutor_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_tomorrow_scheduled_classes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tutor_student_relationships"("tutor_uuid" "uuid") RETURNS TABLE("relationship_id" "uuid", "student_id" "uuid", "student_name" "text", "tutor_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Add error handling and validation
  IF tutor_uuid IS NULL THEN
    RAISE EXCEPTION 'Tutor UUID cannot be null';
  END IF;

  IF get_auth_user_role() IS DISTINCT FROM 'admin' AND auth.uid() IS DISTINCT FROM tutor_uuid THEN
    RAISE EXCEPTION 'Not authorized to view this tutor''s relationships';
  END IF;

  -- Verify tutor exists and has proper role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = tutor_uuid AND role = 'tutor'
  ) THEN
    RAISE EXCEPTION 'Invalid tutor or insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT
    tsa.id as relationship_id,
    tsa.student_id,
    CASE
      WHEN TRIM(COALESCE(p.first_name, '')) != '' OR TRIM(COALESCE(p.last_name, '')) != '' THEN
        TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')))
      ELSE
        COALESCE(p.email, 'Student')
    END as student_name,
    tsa.tutor_id
  FROM public.tutor_student_assigned tsa
  LEFT JOIN public.profiles p ON tsa.student_id = p.id
  WHERE tsa.tutor_id = tutor_uuid
  AND tsa.active = true
  ORDER BY student_name;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return empty result
    RAISE WARNING 'Error in get_tutor_student_relationships: %', SQLERRM;
    RETURN;
END;
$$;


ALTER FUNCTION "public"."get_tutor_student_relationships"("tutor_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tutor_students_by_email"("requesting_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS TABLE("tutor_id" "uuid", "student_id" "uuid", "student_name" "text", "student_email" "text", "tutor_name" "text", "subjects" "text"[], "grade" "text", "active" boolean, "assigned_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = requesting_user_id
    AND role IN ('admin', 'tutor', 'student')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
      tsa.tutor_id,
      tsa.student_id,
      CASE
        WHEN TRIM(COALESCE(sp.first_name, '')) != '' OR TRIM(COALESCE(sp.last_name, '')) != '' THEN
          TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, '')))
        ELSE
          sp.email
      END as student_name,
      sp.email as student_email,
      CASE
        WHEN TRIM(COALESCE(tp.first_name, '')) != '' OR TRIM(COALESCE(tp.last_name, '')) != '' THEN
          TRIM(CONCAT(COALESCE(tp.first_name, ''), ' ', COALESCE(tp.last_name, '')))
        ELSE
          tp.email
      END as tutor_name,
      COALESCE(s.subjects, '{}') as subjects,
      COALESCE(s.grade, 'Not specified') as grade,
      tsa.active,
      tsa.assigned_at
  FROM public.tutor_student_assigned tsa
  LEFT JOIN public.profiles tp ON tsa.tutor_id = tp.id
  LEFT JOIN public.profiles sp ON tsa.student_id = sp.id
  LEFT JOIN public.students s ON sp.email = s.email
  WHERE
    CASE
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'admin' THEN true
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'tutor' THEN tsa.tutor_id = requesting_user_id
      WHEN (SELECT role FROM public.profiles WHERE id = requesting_user_id) = 'student' THEN tsa.student_id = requesting_user_id
      ELSE false
    END
    AND tsa.active = true;
END;
$$;


ALTER FUNCTION "public"."get_tutor_students_by_email"("requesting_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tutor_unpaid_summary"() RETURNS TABLE("tutor_name" "text", "tutor_user_id" "uuid", "unpaid_count" bigint, "total_owed" numeric, "class_ids" "uuid"[], "last_payment_date" "date")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    cl."Tutor Name"                                   AS tutor_name,
    cl.tutor_user_id                                  AS tutor_user_id,
    COUNT(*)::BIGINT                                  AS unpaid_count,
    COALESCE(SUM(cl."Tutor Cost"::NUMERIC), 0)        AS total_owed,
    ARRAY_AGG(cl.id ORDER BY cl."Date")               AS class_ids,
    (
      SELECT MAX(cl2.tutor_payment_date)
      FROM   public.class_logs cl2
      WHERE  cl2."Tutor Name" = cl."Tutor Name"
        AND  cl2.tutor_payment_date IS NOT NULL
    )                                                 AS last_payment_date
  FROM public.class_logs cl
  WHERE cl.tutor_payment_date IS NULL
    AND cl."Tutor Name" IS NOT NULL
    AND (public.get_auth_user_role() = 'admin' OR auth.role() = 'service_role')
  GROUP BY cl."Tutor Name", cl.tutor_user_id
  HAVING COUNT(*) > 0
  ORDER BY total_owed DESC NULLS LAST;
$$;


ALTER FUNCTION "public"."get_tutor_unpaid_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_message_count"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(sum(unread_count), 0)::bigint FROM public.get_my_threads();
$$;


ALTER FUNCTION "public"."get_unread_message_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_zero_credit_upcoming_students"() RETURNS TABLE("student_name" "text", "profile_id" "uuid", "email" "text", "credits_remaining" numeric, "next_class_date" "date", "next_class_title" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_zero_credit_upcoming_students"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guardian_of"("p_student_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT guardian_id
  FROM public.guardian_links
  WHERE student_id = p_student_id
  ORDER BY created_at, guardian_id
  LIMIT 1;
$$;


ALTER FUNCTION "public"."guardian_of"("p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_rest_get_ics"("request" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  feed_id UUID;
  feed_content TEXT;
BEGIN
  -- Get the feed ID from the request URL
  feed_id := (request->'params'->>'id')::UUID;
  
  -- Get the feed content
  feed_content := public.get_ics_feed(feed_id);
  
  -- Return the feed as text with proper headers
  RETURN jsonb_build_object(
    'status', 200,
    'body', feed_content,
    'headers', jsonb_build_object(
      'Content-Type', 'text/calendar',
      'Content-Disposition', 'attachment; filename="calendar.ics"'
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 404,
      'body', 'Calendar feed not found'
    );
END;
$$;


ALTER FUNCTION "public"."handle_rest_get_ics"("request" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_rest_get_ics"("request" "jsonb") IS '@rest GET /calendar/ics/{id}';



CREATE OR REPLACE FUNCTION "public"."has_guardian"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.guardian_links WHERE student_id = p_user_id);
$$;


ALTER FUNCTION "public"."has_guardian"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_student_history"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.tutor_student_assigned WHERE student_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.scheduled_classes WHERE student_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.class_logs WHERE student_user_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.student_subscriptions WHERE student_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.class_credits_ledger WHERE student_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.guardian_links WHERE student_id = p_user_id);
$$;


ALTER FUNCTION "public"."has_student_history"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_class_participant"("p_class_id" "uuid", "p_include_parent" boolean DEFAULT true) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scheduled_classes sc
    WHERE sc.id = p_class_id
      AND (sc.student_id = auth.uid() OR sc.tutor_id = auth.uid()
           OR (p_include_parent AND public.is_guardian_of(sc.student_id)))
  );
$$;


ALTER FUNCTION "public"."is_class_participant"("p_class_id" "uuid", "p_include_parent" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_guardian_of"("p_student_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.guardian_links
    WHERE guardian_id = auth.uid() AND student_id = p_student_id
  );
$$;


ALTER FUNCTION "public"."is_guardian_of"("p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_class_cancellation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF current_setting('learn2lead.completing_class', true) = 'on' THEN
    RETURN OLD;
  END IF;

  INSERT INTO public.class_cancellations (
    scheduled_class_id,
    title,
    subject,
    student_id,
    tutor_id,
    class_date,
    class_start,
    zoom_link,
    notes,
    cancelled_by
  ) VALUES (
    OLD.id,
    OLD.title,
    OLD.subject,
    OLD.student_id,
    OLD.tutor_id,
    OLD.date,
    OLD.start_time,
    OLD.zoom_link,
    OLD.notes,
    auth.uid()
  );
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."log_class_cancellation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_critical_security_event"("event_type" "text", "user_id" "uuid", "details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO security_logs (event_type, user_id, details, created_at)
  VALUES (event_type, user_id, details, now());
  
  -- Also create notification for admins
  INSERT INTO notifications (user_id, message, type, created_at)
  SELECT 
    p.id,
    'SECURITY ALERT: ' || event_type || ' detected',
    'security_alert',
    now()
  FROM profiles p 
  WHERE p.role = 'admin';
END;
$$;


ALTER FUNCTION "public"."log_critical_security_event"("event_type" "text", "user_id" "uuid", "details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_enhanced_security_event"("operation_type" "text", "target_table" "text", "row_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Enhanced logging for sensitive operations
  INSERT INTO security_logs (event_type, user_id, details)
  VALUES (
    'enhanced_security_access',
    auth.uid(),
    jsonb_build_object(
      'operation', operation_type,
      'table', target_table,
      'row_id', row_id,
      'user_role', get_auth_user_role(),
      'timestamp', now()
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Don't let logging failures break the application
    NULL;
END;
$$;


ALTER FUNCTION "public"."log_enhanced_security_event"("operation_type" "text", "target_table" "text", "row_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."login_email_for_username"("p_username" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT email FROM public.profiles WHERE username = lower(btrim(coalesce(p_username, '')));
$$;


ALTER FUNCTION "public"."login_email_for_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_thread_read"("p_thread_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.can_view_thread(p_thread_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.message_reads (thread_id, profile_id, last_read_at)
  VALUES (p_thread_id, auth.uid(), now())
  ON CONFLICT (thread_id, profile_id) DO UPDATE SET last_read_at = now();
END;
$$;


ALTER FUNCTION "public"."mark_thread_read"("p_thread_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_child_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT student_id FROM public.guardian_links WHERE guardian_id = auth.uid();
$$;


ALTER FUNCTION "public"."my_child_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notification_target_for"("p_profile_id" "uuid", "p_category" "text") RETURNS TABLE("user_id" "uuid", "email" "text", "phone" "text", "first_name" "text", "last_name" "text", "timezone" "text", "email_enabled" boolean, "sms_enabled" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."notification_target_for"("p_profile_id" "uuid", "p_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notification_targets"("p_student_id" "uuid", "p_category" "text") RETURNS TABLE("user_id" "uuid", "email" "text", "phone" "text", "first_name" "text", "last_name" "text", "timezone" "text", "is_guardian" boolean, "email_enabled" boolean, "sms_enabled" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."notification_targets"("p_student_id" "uuid", "p_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."post_message"("p_thread_id" "uuid", "p_body" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."post_message"("p_thread_id" "uuid", "p_body" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profiles_parent_controls_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."profiles_parent_controls_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profiles_username_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."profiles_username_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."promote_student_to_tutor"("student_user_id" "uuid", "reason" "text" DEFAULT 'Admin promotion'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_profile RECORD;
  current_admin_id UUID;
  current_admin_role TEXT;
  result jsonb;
BEGIN
  -- Get current user ID and role with explicit checks
  current_admin_id := auth.uid();
  
  IF current_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required - please log in again',
      'code', 'NOT_AUTHENTICATED'
    );
  END IF;
  
  -- Get current user role
  SELECT role INTO current_admin_role FROM profiles WHERE id = current_admin_id;
  
  IF current_admin_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found - please refresh and try again',
      'code', 'PROFILE_NOT_FOUND'
    );
  END IF;
  
  IF current_admin_role != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only admins can promote users',
      'code', 'PERMISSION_DENIED'
    );
  END IF;
  
  -- Get target user profile
  SELECT * INTO current_profile FROM profiles WHERE id = student_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'code', 'USER_NOT_FOUND'
    );
  END IF;
  
  IF current_profile.role != 'student' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is not a student',
      'code', 'INVALID_ROLE'
    );
  END IF;
  
  BEGIN
    -- Update profile role
    UPDATE profiles 
    SET role = 'tutor', updated_at = now()
    WHERE id = student_user_id;
    
    -- Log the promotion with explicit admin ID
    INSERT INTO role_change_audit (
      user_id, old_role, new_role, changed_by, reason
    ) VALUES (
      student_user_id, 'student', 'tutor', current_admin_id, reason
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User successfully promoted to tutor',
      'user_id', student_user_id
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'code', 'PROMOTION_FAILED',
        'details', SQLSTATE
      );
  END;
END;
$$;


ALTER FUNCTION "public"."promote_student_to_tutor"("student_user_id" "uuid", "reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_managed_student"("p_guardian_id" "uuid", "p_student_id" "uuid", "p_grade" "text", "p_notification_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."register_managed_student"("p_guardian_id" "uuid", "p_student_id" "uuid", "p_grade" "text", "p_notification_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."require_admin_access"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF get_auth_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
END;
$$;


ALTER FUNCTION "public"."require_admin_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reverse_class_debit"("p_student_id" "uuid", "p_class_id" "text", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_debit_id uuid;
  v_debit_amount numeric(6,2);
  v_subscription_id uuid;
  v_current numeric(6,2);
  v_new numeric(6,2);
  v_ledger_id uuid;
  v_existing_id uuid;
  v_existing_balance numeric(6,2);
BEGIN
  -- The class really is logged — the debit was correct, never reverse it,
  -- regardless of what the client thinks happened.
  IF EXISTS (SELECT 1 FROM public.class_logs WHERE "Class ID" = p_class_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'class_already_completed');
  END IF;

  SELECT id, amount, subscription_id INTO v_debit_id, v_debit_amount, v_subscription_id
  FROM public.class_credits_ledger
  WHERE related_class_id = p_class_id AND transaction_type = 'debit'
  LIMIT 1;

  IF v_debit_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_debit_found');
  END IF;

  -- Idempotency: this debit was already reversed once, don't do it again.
  SELECT id, balance_after INTO v_existing_id, v_existing_balance
  FROM public.class_credits_ledger
  WHERE reversed_debit_id = v_debit_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'ledger_id', v_existing_id, 'new_balance', v_existing_balance);
  END IF;

  SELECT credits_remaining INTO v_current
  FROM public.student_subscriptions
  WHERE id = v_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'subscription_not_found');
  END IF;

  v_new := v_current - v_debit_amount; -- debit amount is stored negative, so this adds it back

  INSERT INTO public.class_credits_ledger (
    student_id, subscription_id, transaction_type, amount, balance_after, reason, related_class_id, reversed_debit_id
  ) VALUES (
    p_student_id, v_subscription_id, 'credit', -v_debit_amount, v_new, p_reason, p_class_id, v_debit_id
  )
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object('success', true, 'idempotent', false, 'ledger_id', v_ledger_id, 'new_balance', v_new);

EXCEPTION WHEN unique_violation THEN
  SELECT id, balance_after INTO v_existing_id, v_existing_balance
  FROM public.class_credits_ledger WHERE reversed_debit_id = v_debit_id;
  RETURN jsonb_build_object('success', true, 'idempotent', true, 'ledger_id', v_existing_id, 'new_balance', v_existing_balance);
END;
$$;


ALTER FUNCTION "public"."reverse_class_debit"("p_student_id" "uuid", "p_class_id" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rotate_child_calendar_feed_token"("p_student_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."rotate_child_calendar_feed_token"("p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rotate_my_calendar_feed_token"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_token uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.calendar_feed_tokens (user_id, token, rotated_at)
  VALUES (auth.uid(), gen_random_uuid(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET token = gen_random_uuid(), rotated_at = now()
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;


ALTER FUNCTION "public"."rotate_my_calendar_feed_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_my_username"("p_username" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."set_my_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_stripe_webhook_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."set_stripe_webhook_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_student_hours_visibility"("p_student_id" "uuid", "p_visible" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."set_student_hours_visibility"("p_student_id" "uuid", "p_visible" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."student_notification_recipients"("p_student_id" "uuid", "p_category" "text") RETURNS TABLE("user_id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "timezone" "text", "is_guardian" boolean, "notify_class_reminders" boolean, "notify_low_credits" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."student_notification_recipients"("p_student_id" "uuid", "p_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_name_from_roster"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_name  text := TRIM(COALESCE(NEW.name, ''));
  v_first text;
  v_last  text;
  v_space int;
BEGIN
  -- Fired by the profile -> roster sync above: nothing to do.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF v_name = '' OR v_name LIKE '%@%' OR NEW.name IS NOT DISTINCT FROM OLD.name THEN
    RETURN NEW;
  END IF;

  SELECT first_name, last_name INTO v_first, v_last
  FROM public.profiles WHERE lower(email) = lower(NEW.email);
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  IF v_name = TRIM(CONCAT(COALESCE(v_first, ''), ' ', COALESCE(v_last, ''))) THEN
    RETURN NEW;
  END IF;

  v_space := position(' ' in v_name);
  IF v_space = 0 THEN
    UPDATE public.profiles SET first_name = v_name
    WHERE lower(email) = lower(NEW.email);
  ELSE
    UPDATE public.profiles
    SET first_name = substring(v_name from 1 for v_space - 1),
        last_name  = TRIM(substring(v_name from v_space + 1))
    WHERE lower(email) = lower(NEW.email);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_profile_name_from_roster"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_roster_name_from_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_full text := TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')));
BEGIN
  IF v_full = '' THEN
    RETURN NEW;
  END IF;

  UPDATE public.students SET name = v_full
  WHERE lower(email) = lower(NEW.email) AND name IS DISTINCT FROM v_full;

  UPDATE public.tutors SET name = v_full
  WHERE lower(email) = lower(NEW.email) AND name IS DISTINCT FROM v_full;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_roster_name_from_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_scheduled_class_times"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_use_instants boolean;
BEGIN
  NEW.timezone := COALESCE(NULLIF(NEW.timezone, ''), 'America/Chicago');

  IF TG_OP = 'INSERT' THEN
    v_use_instants := NEW.start_at IS NOT NULL;
  ELSE
    v_use_instants := NEW.start_at IS DISTINCT FROM OLD.start_at
                   OR NEW.end_at   IS DISTINCT FROM OLD.end_at;
  END IF;

  IF v_use_instants THEN
    IF NEW.end_at IS NULL OR NEW.end_at <= NEW.start_at THEN
      RAISE EXCEPTION 'Class end time must be after its start time';
    END IF;
    NEW.date       := (NEW.start_at AT TIME ZONE 'America/Chicago')::date;
    NEW.start_time := (NEW.start_at AT TIME ZONE 'America/Chicago')::time;
    NEW.end_time   := (NEW.end_at   AT TIME ZONE 'America/Chicago')::time;
  ELSIF TG_OP = 'INSERT'
     OR NEW.date       IS DISTINCT FROM OLD.date
     OR NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.end_time   IS DISTINCT FROM OLD.end_time THEN
    NEW.start_at := (NEW.date + NEW.start_time) AT TIME ZONE 'America/Chicago';
    NEW.end_at   := (NEW.date + NEW.end_time
                     + CASE WHEN NEW.end_time <= NEW.start_time THEN interval '1 day' ELSE interval '0' END
                    ) AT TIME ZONE 'America/Chicago';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_scheduled_class_times"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_subscription_credits"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update the subscription record with the new balance from ledger
  UPDATE student_subscriptions
  SET credits_remaining = NEW.balance_after,
      updated_at = now()
  WHERE id = NEW.subscription_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_subscription_credits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_roles"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  missing_students_count INTEGER := 0;
  missing_tutors_count INTEGER := 0;
  created_students_count INTEGER := 0;
  created_tutors_count INTEGER := 0;
  profile_record RECORD;
BEGIN
  -- Count missing student records
  SELECT COUNT(*) INTO missing_students_count
  FROM profiles p
  WHERE p.role = 'student' 
  AND NOT EXISTS (
    SELECT 1 FROM students s WHERE s.email = p.email
  );
  
  -- Count missing tutor records  
  SELECT COUNT(*) INTO missing_tutors_count
  FROM profiles p
  WHERE p.role = 'tutor'
  AND NOT EXISTS (
    SELECT 1 FROM tutors t WHERE t.email = p.email
  );
  
  -- Create missing student records
  FOR profile_record IN 
    SELECT p.* FROM profiles p
    WHERE p.role = 'student'
    AND NOT EXISTS (
      SELECT 1 FROM students s WHERE s.email = p.email
    )
  LOOP
    INSERT INTO students (
      name,
      email,
      subjects,
      grade,
      payment_status,
      enrollment_date,
      active
    ) VALUES (
      CASE 
        WHEN TRIM(COALESCE(profile_record.first_name, '')) != '' OR TRIM(COALESCE(profile_record.last_name, '')) != '' THEN
          TRIM(CONCAT(COALESCE(profile_record.first_name, ''), ' ', COALESCE(profile_record.last_name, '')))
        ELSE 
          profile_record.email
      END,
      profile_record.email,
      '{}',
      'Not specified',
      'paid',
      CURRENT_DATE,
      true
    );
    
    created_students_count := created_students_count + 1;
  END LOOP;
  
  -- Create missing tutor records
  FOR profile_record IN 
    SELECT p.* FROM profiles p
    WHERE p.role = 'tutor'
    AND NOT EXISTS (
      SELECT 1 FROM tutors t WHERE t.email = p.email
    )
  LOOP
    INSERT INTO tutors (
      name,
      email,
      subjects,
      hourly_rate,
      active
    ) VALUES (
      CASE 
        WHEN TRIM(COALESCE(profile_record.first_name, '')) != '' OR TRIM(COALESCE(profile_record.last_name, '')) != '' THEN
          TRIM(CONCAT(COALESCE(profile_record.first_name, ''), ' ', COALESCE(profile_record.last_name, '')))
        ELSE 
          profile_record.email
      END,
      profile_record.email,
      '{}',
      25,
      true
    );
    
    created_tutors_count := created_tutors_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'missing_students_found', missing_students_count,
    'missing_tutors_found', missing_tutors_count,
    'students_created', created_students_count,
    'tutors_created', created_tutors_count,
    'message', 'Role sync completed successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Role sync failed'
    );
END;
$$;


ALTER FUNCTION "public"."sync_user_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."thread_role"("p_thread_id" "uuid", "p_profile_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT CASE
    WHEN p_profile_id = t.tutor_id THEN 'tutor'
    WHEN p_profile_id = t.student_id THEN 'student'
    WHEN EXISTS (SELECT 1 FROM public.guardian_links gl
                 WHERE gl.student_id = t.student_id AND gl.guardian_id = p_profile_id) THEN 'parent'
    WHEN (SELECT role FROM public.profiles WHERE id = p_profile_id) = 'admin' THEN 'staff'
    ELSE 'former'
  END
  FROM public.message_threads t WHERE t.id = p_thread_id;
$$;


ALTER FUNCTION "public"."thread_role"("p_thread_id" "uuid", "p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_my_child"("p_student_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_grade" "text", "p_notification_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
$_$;


ALTER FUNCTION "public"."update_my_child"("p_student_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_grade" "text", "p_notification_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_referral_codes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_referral_codes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_student_notes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_student_notes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_student_subscriptions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_student_subscriptions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."username_problem"("p_username" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $_$
  SELECT CASE
    WHEN lower(btrim(coalesce(p_username, ''))) !~ '^[a-z0-9][a-z0-9._]{2,29}$' THEN 'invalid'
    WHEN lower(btrim(p_username)) ~ '[._]{2}' OR lower(btrim(p_username)) ~ '[._]$' THEN 'invalid'
    WHEN lower(btrim(p_username)) IN (
      'admin', 'administrator', 'support', 'help', 'learn2lead', 'root',
      'system', 'tutor', 'tutors', 'parent', 'parents', 'student', 'students',
      'staff', 'moderator', 'billing', 'security', 'null', 'undefined'
    ) THEN 'reserved'
  END;
$_$;


ALTER FUNCTION "public"."username_problem"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_payment_method"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.payment_method IS NOT NULL AND NEW.payment_method NOT IN ('stripe', 'zelle') THEN
    RAISE EXCEPTION 'payment_method must be either stripe or zelle';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_payment_method"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_role_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_role_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_timezone_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.timezone IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone) THEN
    RAISE EXCEPTION 'Invalid time zone: %', NEW.timezone;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_timezone_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "subject_id" "uuid",
    "action" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."account_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auto_renewal_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "renewal_pack" "text" DEFAULT 'standard'::"text" NOT NULL,
    "threshold" integer DEFAULT 1 NOT NULL,
    "stripe_customer_id" "text",
    "last_renewal_at" timestamp with time zone,
    "last_renewal_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "auto_renewal_settings_pack_check" CHECK (("renewal_pack" = ANY (ARRAY['basic'::"text", 'standard'::"text", 'premium'::"text"]))),
    CONSTRAINT "auto_renewal_settings_threshold_check" CHECK ((("threshold" >= 1) AND ("threshold" <= 10)))
);


ALTER TABLE "public"."auto_renewal_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blocked_log_notifications" (
    "class_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."blocked_log_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_feed_tokens" (
    "user_id" "uuid" NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rotated_at" timestamp with time zone
);


ALTER TABLE "public"."calendar_feed_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_cancellations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scheduled_class_id" "uuid" NOT NULL,
    "title" "text",
    "subject" "text",
    "student_id" "uuid",
    "tutor_id" "uuid",
    "class_date" "date",
    "class_start" time without time zone,
    "zoom_link" "text",
    "notes" "text",
    "cancelled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cancelled_by" "uuid"
);


ALTER TABLE "public"."class_cancellations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_credits_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "subscription_id" "uuid",
    "transaction_type" "text" NOT NULL,
    "amount" numeric(6,2) NOT NULL,
    "balance_after" numeric(6,2) NOT NULL,
    "related_class_id" "text",
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "invoice_id" "text",
    "dollar_amount" numeric(10,2),
    "reversed_debit_id" "uuid",
    CONSTRAINT "class_credits_ledger_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['credit'::"text", 'debit'::"text", 'refund'::"text", 'adjustment'::"text"])))
);


ALTER TABLE "public"."class_credits_ledger" OWNER TO "postgres";


COMMENT ON COLUMN "public"."class_credits_ledger"."invoice_id" IS 'Stripe invoice ID for idempotent credit processing';



CREATE TABLE IF NOT EXISTS "public"."class_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "Class Number" "text",
    "Tutor Name" "text" DEFAULT ''::"text",
    "Student Name" "text" DEFAULT ''::"text",
    "Date" "date" NOT NULL,
    "Day" "text",
    "Time (CST)" "text",
    "Time (hrs)" "text",
    "Subject" "text",
    "Content" "text",
    "HW" "text",
    "Class ID" "text",
    "Additional Info" "text",
    "verified_by_student" boolean DEFAULT false,
    "verification_deadline" timestamp with time zone,
    "disputed" boolean DEFAULT false,
    "dispute_reason" "text",
    "Class Cost" numeric(10,2),
    "Tutor Cost" numeric(10,2),
    "student_payment_date" "date",
    "tutor_payment_date" "date",
    "Title" "text",
    "student_user_id" "uuid",
    "tutor_user_id" "uuid",
    "tutor_is_paid" boolean DEFAULT false NOT NULL,
    "student_rating" integer,
    "student_feedback" "text",
    "start_at" timestamp with time zone,
    "timezone" "text" DEFAULT 'America/Chicago'::"text" NOT NULL,
    CONSTRAINT "class_logs_student_rating_check" CHECK ((("student_rating" >= 1) AND ("student_rating" <= 5)))
);

ALTER TABLE ONLY "public"."class_logs" REPLICA IDENTITY FULL;


ALTER TABLE "public"."class_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_logs" IS 'Class logs with strict RLS: tutors see only their own logs, students see only their own logs';



COMMENT ON COLUMN "public"."class_logs"."Class Cost" IS 'Cost charged to student for the class (numeric)';



COMMENT ON COLUMN "public"."class_logs"."Tutor Cost" IS 'Cost paid to tutor for the class (numeric)';



COMMENT ON COLUMN "public"."class_logs"."Title" IS 'Descriptive class title from the scheduled class, separate from the unique Class Number ID';



CREATE TABLE IF NOT EXISTS "public"."class_uploads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "student_name" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" "text" NOT NULL,
    "upload_date" "date" NOT NULL,
    "note" "text",
    "file_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."class_uploads" REPLICA IDENTITY FULL;


ALTER TABLE "public"."class_uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "value" "text" NOT NULL,
    "verified_at" timestamp with time zone,
    "opted_in_at" timestamp with time zone,
    "opted_out_at" timestamp with time zone,
    "consent_text" "text",
    "verification_code_hash" "text",
    "verification_expires_at" timestamp with time zone,
    "verification_attempts" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contact_methods_kind_check" CHECK (("kind" = 'sms'::"text")),
    CONSTRAINT "contact_methods_value_check" CHECK (("value" ~ '^\+[1-9][0-9]{7,14}$'::"text"))
);


ALTER TABLE "public"."contact_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "receiver_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "file_path" "text",
    "content_type" "text",
    "shared_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "viewed_at" timestamp with time zone
);


ALTER TABLE "public"."content_shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "plan_id" "uuid",
    "stripe_subscription_id" "text" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "credits_remaining" numeric(6,2) DEFAULT 0 NOT NULL,
    "credits_allocated" numeric(6,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "manual_price_per_hour" numeric,
    "manual_priced_classes_remaining" numeric(6,2),
    CONSTRAINT "student_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'past_due'::"text", 'trialing'::"text", 'incomplete'::"text"])))
);


ALTER TABLE "public"."student_subscriptions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."student_subscriptions"."manual_price_per_hour" IS 'One-off admin-declared $/hour rate for manually-credited hours (e.g. a Zelle side agreement). Applies only while manual_priced_classes_remaining > 0, then Class Cost reverts to the Stripe-plan-derived price.';



COMMENT ON COLUMN "public"."student_subscriptions"."manual_priced_classes_remaining" IS 'Classes left to price at manual_price_per_class. Decremented by 1 each time complete_class_atomic prices a class using it; once it hits 0, pricing falls back to subscription_plans.price_per_class.';



CREATE OR REPLACE VIEW "public"."credit_discrepancies" WITH ("security_invoker"='true') AS
 SELECT "ss"."student_id",
    "ss"."id" AS "subscription_id",
    "ss"."credits_remaining" AS "subscription_credits",
    COALESCE(( SELECT "class_credits_ledger"."balance_after"
           FROM "public"."class_credits_ledger"
          WHERE (("class_credits_ledger"."student_id" = "ss"."student_id") AND ("class_credits_ledger"."subscription_id" = "ss"."id"))
          ORDER BY "class_credits_ledger"."created_at" DESC
         LIMIT 1), (0)::numeric) AS "ledger_credits",
    ("ss"."credits_remaining" - COALESCE(( SELECT "class_credits_ledger"."balance_after"
           FROM "public"."class_credits_ledger"
          WHERE (("class_credits_ledger"."student_id" = "ss"."student_id") AND ("class_credits_ledger"."subscription_id" = "ss"."id"))
          ORDER BY "class_credits_ledger"."created_at" DESC
         LIMIT 1), (0)::numeric)) AS "difference"
   FROM "public"."student_subscriptions" "ss"
  WHERE (("ss"."status" = ANY (ARRAY['active'::"text", 'trialing'::"text"])) AND ("ss"."credits_remaining" <> COALESCE(( SELECT "class_credits_ledger"."balance_after"
           FROM "public"."class_credits_ledger"
          WHERE (("class_credits_ledger"."student_id" = "ss"."student_id") AND ("class_credits_ledger"."subscription_id" = "ss"."id"))
          ORDER BY "class_credits_ledger"."created_at" DESC
         LIMIT 1), (0)::numeric)));


ALTER TABLE "public"."credit_discrepancies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guardian_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '14 days'::interval) NOT NULL,
    "accepted_by" "uuid",
    "accepted_at" timestamp with time zone,
    CONSTRAINT "guardian_invites_email_check" CHECK ((("email" = "lower"("btrim"("email"))) AND ("email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text"))),
    CONSTRAINT "guardian_invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."guardian_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guardian_links" (
    "guardian_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "created_via" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "guardian_links_check" CHECK (("guardian_id" <> "student_id")),
    CONSTRAINT "guardian_links_created_via_check" CHECK (("created_via" = ANY (ARRAY['parent_added'::"text", 'invite'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."guardian_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."guardian_links" IS 'Parent <-> student links. A link means the parent pays for and sees that student. v1 allows one parent per student (enforced in the functions that create links, not the schema, so a second guardian needs no schema change).';



CREATE TABLE IF NOT EXISTS "public"."message_reads" (
    "thread_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "last_read_at" timestamp with time zone,
    "last_notified_at" timestamp with time zone
);


ALTER TABLE "public"."message_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "tutor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_message_at" timestamp with time zone
);


ALTER TABLE "public"."message_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "messages_body_check" CHECK ((("length"("btrim"("body")) >= 1) AND ("length"("btrim"("body")) <= 4000)))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_reports_sent" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "report_month" "date" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "report_content" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."monthly_reports_sent" OWNER TO "postgres";


COMMENT ON TABLE "public"."monthly_reports_sent" IS 'Tracks monthly progress reports sent to students via email';



CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "profile_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "enabled" boolean NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notification_preferences_category_check" CHECK (("category" = ANY (ARRAY['class_reminders'::"text", 'class_updates'::"text", 'billing'::"text", 'summaries'::"text", 'messages'::"text"]))),
    CONSTRAINT "notification_preferences_channel_check" CHECK (("channel" = ANY (ARRAY['email'::"text", 'sms'::"text"])))
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_preferences" IS 'Per person, per kind, per channel. A missing row means the default (see notification_targets).';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'class_reminder'::"text" NOT NULL,
    "related_id" "uuid",
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."overdraw_reminders_sent" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "threshold" integer NOT NULL,
    "amount_owed" numeric NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."overdraw_reminders_sent" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text",
    "role" "public"."app_role" DEFAULT 'student'::"public"."app_role" NOT NULL,
    "bio" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "zoom_link" "text",
    "notify_class_reminders" boolean DEFAULT true,
    "notify_low_credits" boolean DEFAULT true,
    "timezone" "text",
    "managed" boolean DEFAULT false NOT NULL,
    "notification_email" "text",
    "hide_hours_from_student" boolean DEFAULT false NOT NULL,
    "username" "text" NOT NULL,
    "must_change_password" boolean DEFAULT false NOT NULL,
    CONSTRAINT "profiles_first_name_not_blank" CHECK ((TRIM(BOTH FROM "first_name") <> ''::"text")),
    CONSTRAINT "profiles_notification_email_format" CHECK ((("notification_email" IS NULL) OR ("notification_email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text"))),
    CONSTRAINT "profiles_username_format" CHECK ((("username" = "lower"("username")) AND ("public"."username_problem"("username") IS NULL)))
);

ALTER TABLE ONLY "public"."profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles with strict RLS: users see own profile, tutors/students see their assigned counterparts only';



COMMENT ON COLUMN "public"."profiles"."managed" IS 'Student added by a parent: no login, placeholder auth email, billed and contacted through guardian_links.';



COMMENT ON COLUMN "public"."profiles"."notification_email" IS 'Optional real address for a managed student''s own class emails (reminders, homework). Never used to log in.';



COMMENT ON COLUMN "public"."profiles"."hide_hours_from_student" IS 'Set by the student''s parent: the student doesn''t see the family''s hours remaining.';



COMMENT ON COLUMN "public"."profiles"."username" IS 'Unique sign-in name (lowercase). Works anywhere an email does on the login page.';



COMMENT ON COLUMN "public"."profiles"."must_change_password" IS 'Set when a parent sets or resets a student''s password; the student must choose their own at next sign-in.';



CREATE TABLE IF NOT EXISTS "public"."referral_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "discount_amount" numeric DEFAULT 25.00 NOT NULL,
    "stripe_coupon_id" "text" NOT NULL,
    "max_uses" integer,
    "times_used" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone,
    "created_by" "uuid",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "discount_type" "text" DEFAULT 'fixed'::"text" NOT NULL,
    CONSTRAINT "referral_codes_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['fixed'::"text", 'percent'::"text"])))
);


ALTER TABLE "public"."referral_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referral_code_id" "uuid" NOT NULL,
    "used_by_user_id" "uuid" NOT NULL,
    "used_by_email" "text" NOT NULL,
    "subscription_id" "text",
    "used_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."referral_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_change_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "old_role" "text" NOT NULL,
    "new_role" "text" NOT NULL,
    "changed_by" "uuid",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."role_change_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "tutor_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "subject" "text" NOT NULL,
    "zoom_link" "text",
    "notes" "text",
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "attendance" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "relationship_id" "uuid",
    "reminder_sent" boolean DEFAULT false,
    "materials_url" "text"[] DEFAULT '{}'::"text"[],
    "reminder_24h_sent" boolean DEFAULT false,
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "timezone" "text" DEFAULT 'America/Chicago'::"text" NOT NULL
);

ALTER TABLE ONLY "public"."scheduled_classes" REPLICA IDENTITY FULL;


ALTER TABLE "public"."scheduled_classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "status" "text" DEFAULT 'received'::"text" NOT NULL,
    "error_message" "text",
    "is_test_event" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stripe_webhook_events_status_check" CHECK (("status" = ANY (ARRAY['received'::"text", 'processed'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."stripe_webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tutor_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."student_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "grade" "text",
    "subjects" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "enrollment_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "learning_pace" "public"."learning_pace",
    "teaching_style_pref" "public"."teaching_style",
    "session_structure_pref" "public"."session_structure",
    "primary_goal" "public"."student_goal",
    "availability_windows" "text"[] DEFAULT '{}'::"text"[],
    "communication_pref" "public"."communication_style",
    "payment_method" "text" DEFAULT 'zelle'::"text",
    "prepaid_balance" numeric DEFAULT 0,
    "prepaid_class_count" integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY "public"."students" REPLICA IDENTITY FULL;


ALTER TABLE "public"."students" OWNER TO "postgres";


COMMENT ON TABLE "public"."students" IS 'Student records with strict RLS: tutors see only assigned students via tutor_student_assigned';



CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "stripe_product_id" "text" NOT NULL,
    "monthly_price" numeric NOT NULL,
    "classes_per_month" integer NOT NULL,
    "price_per_hour" numeric NOT NULL,
    "description" "text",
    "features" "text"[],
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tutor_payroll_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tutor_name" "text" NOT NULL,
    "paid_at" "date" DEFAULT CURRENT_DATE NOT NULL,
    "amount_paid" numeric(10,2) NOT NULL,
    "class_count" integer NOT NULL,
    "class_ids" "uuid"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tutor_user_id" "uuid"
);


ALTER TABLE "public"."tutor_payroll_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tutor_student_assigned" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tutor_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "subject" "text"
);

ALTER TABLE ONLY "public"."tutor_student_assigned" REPLICA IDENTITY FULL;


ALTER TABLE "public"."tutor_student_assigned" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tutors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "subjects" "text"[] DEFAULT '{}'::"text"[],
    "hourly_rate" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "teaching_style_strength" "public"."teaching_style",
    "preferred_pace" "public"."learning_pace",
    "pace_flexibility" boolean DEFAULT true,
    "session_structure" "public"."session_structure",
    "specialty_focus" "public"."tutor_specialty",
    "availability_windows" "text"[] DEFAULT '{}'::"text"[],
    "grade_level_comfort" "text"[] DEFAULT '{}'::"text"[]
);

ALTER TABLE ONLY "public"."tutors" REPLICA IDENTITY FULL;


ALTER TABLE "public"."tutors" OWNER TO "postgres";


ALTER TABLE ONLY "public"."account_audit_log"
    ADD CONSTRAINT "account_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_activity_log"
    ADD CONSTRAINT "admin_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auto_renewal_settings"
    ADD CONSTRAINT "auto_renewal_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auto_renewal_settings"
    ADD CONSTRAINT "auto_renewal_settings_student_unique" UNIQUE ("student_id");



ALTER TABLE ONLY "public"."blocked_log_notifications"
    ADD CONSTRAINT "blocked_log_notifications_pkey" PRIMARY KEY ("class_id");



ALTER TABLE ONLY "public"."calendar_feed_tokens"
    ADD CONSTRAINT "calendar_feed_tokens_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."calendar_feed_tokens"
    ADD CONSTRAINT "calendar_feed_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."class_cancellations"
    ADD CONSTRAINT "class_cancellations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_credits_ledger"
    ADD CONSTRAINT "class_credits_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_logs"
    ADD CONSTRAINT "class_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_uploads"
    ADD CONSTRAINT "class_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_methods"
    ADD CONSTRAINT "contact_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_methods"
    ADD CONSTRAINT "contact_methods_profile_id_kind_key" UNIQUE ("profile_id", "kind");



ALTER TABLE ONLY "public"."content_shares"
    ADD CONSTRAINT "content_shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guardian_invites"
    ADD CONSTRAINT "guardian_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guardian_invites"
    ADD CONSTRAINT "guardian_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."guardian_links"
    ADD CONSTRAINT "guardian_links_pkey" PRIMARY KEY ("guardian_id", "student_id");



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_pkey" PRIMARY KEY ("thread_id", "profile_id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_student_id_tutor_id_key" UNIQUE ("student_id", "tutor_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_reports_sent"
    ADD CONSTRAINT "monthly_reports_sent_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("profile_id", "category", "channel");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."overdraw_reminders_sent"
    ADD CONSTRAINT "overdraw_reminders_sent_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_usage"
    ADD CONSTRAINT "referral_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_change_audit"
    ADD CONSTRAINT "role_change_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_classes"
    ADD CONSTRAINT "scheduled_classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_webhook_events"
    ADD CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_webhook_events"
    ADD CONSTRAINT "stripe_webhook_events_stripe_event_id_key" UNIQUE ("stripe_event_id");



ALTER TABLE ONLY "public"."student_notes"
    ADD CONSTRAINT "student_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_subscriptions"
    ADD CONSTRAINT "student_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_subscriptions"
    ADD CONSTRAINT "student_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_stripe_price_id_key" UNIQUE ("stripe_price_id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_stripe_product_id_key" UNIQUE ("stripe_product_id");



ALTER TABLE ONLY "public"."tutor_payroll_runs"
    ADD CONSTRAINT "tutor_payroll_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tutor_student_assigned"
    ADD CONSTRAINT "tutor_student_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tutors"
    ADD CONSTRAINT "tutors_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."tutors"
    ADD CONSTRAINT "tutors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_logs"
    ADD CONSTRAINT "unique_class_id" UNIQUE ("Class ID");



ALTER TABLE ONLY "public"."class_logs"
    ADD CONSTRAINT "unique_class_log_per_session" UNIQUE ("Tutor Name", "Student Name", "Date", "Time (CST)", "Subject");



CREATE INDEX "account_audit_log_subject_idx" ON "public"."account_audit_log" USING "btree" ("subject_id", "created_at" DESC);



CREATE INDEX "contact_methods_value_idx" ON "public"."contact_methods" USING "btree" ("value");



CREATE INDEX "guardian_invites_email_idx" ON "public"."guardian_invites" USING "btree" ("email") WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "guardian_invites_one_pending_per_student" ON "public"."guardian_invites" USING "btree" ("student_id") WHERE ("status" = 'pending'::"text");



CREATE INDEX "guardian_links_student_id_idx" ON "public"."guardian_links" USING "btree" ("student_id");



CREATE INDEX "idx_account_audit_log_actor_id" ON "public"."account_audit_log" USING "btree" ("actor_id");



CREATE INDEX "idx_admin_activity_log_admin" ON "public"."admin_activity_log" USING "btree" ("admin_id", "created_at" DESC);



CREATE INDEX "idx_admin_activity_log_created" ON "public"."admin_activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_class_cancellations_cancelled_by" ON "public"."class_cancellations" USING "btree" ("cancelled_by");



CREATE UNIQUE INDEX "idx_class_credits_ledger_class_debit_unique" ON "public"."class_credits_ledger" USING "btree" ("related_class_id") WHERE (("related_class_id" IS NOT NULL) AND ("transaction_type" = 'debit'::"text"));



CREATE INDEX "idx_class_credits_ledger_invoice_id" ON "public"."class_credits_ledger" USING "btree" ("invoice_id") WHERE ("invoice_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_class_credits_ledger_reversal_unique" ON "public"."class_credits_ledger" USING "btree" ("reversed_debit_id") WHERE ("reversed_debit_id" IS NOT NULL);



CREATE INDEX "idx_class_credits_ledger_student_id" ON "public"."class_credits_ledger" USING "btree" ("student_id");



CREATE INDEX "idx_class_credits_ledger_subscription_id" ON "public"."class_credits_ledger" USING "btree" ("subscription_id");



CREATE INDEX "idx_class_logs_class_id" ON "public"."class_logs" USING "btree" ("Class ID");



CREATE INDEX "idx_class_logs_date" ON "public"."class_logs" USING "btree" ("Date");



CREATE INDEX "idx_class_logs_start_at" ON "public"."class_logs" USING "btree" ("start_at");



CREATE INDEX "idx_class_logs_student" ON "public"."class_logs" USING "btree" ("Student Name");



CREATE INDEX "idx_class_logs_student_user_id" ON "public"."class_logs" USING "btree" ("student_user_id");



CREATE INDEX "idx_class_logs_tutor" ON "public"."class_logs" USING "btree" ("Tutor Name");



CREATE INDEX "idx_class_logs_tutor_user_id" ON "public"."class_logs" USING "btree" ("tutor_user_id");



CREATE INDEX "idx_class_uploads_class_id" ON "public"."class_uploads" USING "btree" ("class_id");



CREATE INDEX "idx_content_shares_receiver_id" ON "public"."content_shares" USING "btree" ("receiver_id");



CREATE INDEX "idx_content_shares_sender_id" ON "public"."content_shares" USING "btree" ("sender_id");



CREATE INDEX "idx_guardian_invites_accepted_by" ON "public"."guardian_invites" USING "btree" ("accepted_by");



CREATE INDEX "idx_message_reads_profile_id" ON "public"."message_reads" USING "btree" ("profile_id");



CREATE INDEX "idx_message_threads_tutor_id" ON "public"."message_threads" USING "btree" ("tutor_id");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_monthly_reports_student_month" ON "public"."monthly_reports_sent" USING "btree" ("student_id", "report_month" DESC);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_overdraw_reminders_student_threshold" ON "public"."overdraw_reminders_sent" USING "btree" ("student_id", "threshold");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_referral_codes_created_by" ON "public"."referral_codes" USING "btree" ("created_by");



CREATE INDEX "idx_referral_usage_referral_code_id" ON "public"."referral_usage" USING "btree" ("referral_code_id");



CREATE UNIQUE INDEX "idx_referral_usage_session_idempotency" ON "public"."referral_usage" USING "btree" ("subscription_id") WHERE ("subscription_id" IS NOT NULL);



CREATE INDEX "idx_referral_usage_used_by_user_id" ON "public"."referral_usage" USING "btree" ("used_by_user_id");



CREATE INDEX "idx_role_change_audit_changed_by" ON "public"."role_change_audit" USING "btree" ("changed_by");



CREATE INDEX "idx_scheduled_classes_24h_reminder" ON "public"."scheduled_classes" USING "btree" ("date", "reminder_24h_sent") WHERE ("reminder_24h_sent" = false);



CREATE INDEX "idx_scheduled_classes_relationship_id" ON "public"."scheduled_classes" USING "btree" ("relationship_id");



CREATE INDEX "idx_scheduled_classes_start_at" ON "public"."scheduled_classes" USING "btree" ("start_at");



CREATE INDEX "idx_scheduled_classes_student_id" ON "public"."scheduled_classes" USING "btree" ("student_id");



CREATE INDEX "idx_scheduled_classes_tutor_id" ON "public"."scheduled_classes" USING "btree" ("tutor_id");



CREATE INDEX "idx_stripe_webhook_events_status" ON "public"."stripe_webhook_events" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_stripe_webhook_events_type" ON "public"."stripe_webhook_events" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_student_subscriptions_plan_id" ON "public"."student_subscriptions" USING "btree" ("plan_id");



CREATE INDEX "idx_student_subscriptions_status" ON "public"."student_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_student_subscriptions_student_id" ON "public"."student_subscriptions" USING "btree" ("student_id");



CREATE INDEX "idx_students_email" ON "public"."students" USING "btree" ("email");



CREATE INDEX "idx_tutor_payroll_runs_tutor_user_id" ON "public"."tutor_payroll_runs" USING "btree" ("tutor_user_id");



CREATE INDEX "idx_tutor_student_assigned_active" ON "public"."tutor_student_assigned" USING "btree" ("active") WHERE ("active" = true);



CREATE UNIQUE INDEX "idx_tutor_student_assigned_active_pair" ON "public"."tutor_student_assigned" USING "btree" ("tutor_id", "student_id") WHERE ("active" = true);



CREATE INDEX "idx_tutor_student_assigned_student_id" ON "public"."tutor_student_assigned" USING "btree" ("student_id");



CREATE INDEX "messages_thread_created_idx" ON "public"."messages" USING "btree" ("thread_id", "created_at");



CREATE UNIQUE INDEX "profiles_username_key" ON "public"."profiles" USING "btree" ("username");



CREATE UNIQUE INDEX "referral_usage_email_unique" ON "public"."referral_usage" USING "btree" ("used_by_email");



CREATE OR REPLACE TRIGGER "auto_class_log_trigger" AFTER UPDATE ON "public"."scheduled_classes" FOR EACH ROW EXECUTE FUNCTION "public"."auto_create_class_log"();



CREATE OR REPLACE TRIGGER "auto_create_class_log_trigger" AFTER UPDATE ON "public"."scheduled_classes" FOR EACH ROW EXECUTE FUNCTION "public"."auto_create_class_log"();



CREATE OR REPLACE TRIGGER "auto_sync_user_role_trigger" AFTER INSERT OR UPDATE OF "role" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."auto_sync_user_role"();



CREATE OR REPLACE TRIGGER "role_change_validation" BEFORE UPDATE OF "role" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."validate_role_change"();



CREATE OR REPLACE TRIGGER "sync_credits_after_ledger_insert" AFTER INSERT ON "public"."class_credits_ledger" FOR EACH ROW EXECUTE FUNCTION "public"."sync_subscription_credits"();



CREATE OR REPLACE TRIGGER "trg_enforce_class_logs_update_columns" BEFORE UPDATE ON "public"."class_logs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_class_logs_update_columns"();



CREATE OR REPLACE TRIGGER "trg_log_class_cancellation" BEFORE DELETE ON "public"."scheduled_classes" FOR EACH ROW EXECUTE FUNCTION "public"."log_class_cancellation"();



CREATE OR REPLACE TRIGGER "trg_profiles_parent_controls_guard" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."profiles_parent_controls_guard"();



CREATE OR REPLACE TRIGGER "trg_profiles_username_guard" BEFORE INSERT OR UPDATE OF "username" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."profiles_username_guard"();



CREATE OR REPLACE TRIGGER "trg_stripe_webhook_events_updated_at" BEFORE UPDATE ON "public"."stripe_webhook_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_stripe_webhook_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_profile_name_from_student" AFTER UPDATE OF "name" ON "public"."students" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_name_from_roster"();



CREATE OR REPLACE TRIGGER "trg_sync_profile_name_from_tutor" AFTER UPDATE OF "name" ON "public"."tutors" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_name_from_roster"();



CREATE OR REPLACE TRIGGER "trg_sync_roster_name_from_profile" AFTER UPDATE OF "first_name", "last_name" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_roster_name_from_profile"();



CREATE OR REPLACE TRIGGER "trg_sync_scheduled_class_times" BEFORE INSERT OR UPDATE ON "public"."scheduled_classes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_scheduled_class_times"();



CREATE OR REPLACE TRIGGER "trg_validate_profile_timezone" BEFORE INSERT OR UPDATE OF "timezone" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."validate_timezone_column"();



CREATE OR REPLACE TRIGGER "trg_validate_scheduled_class_timezone" BEFORE INSERT OR UPDATE OF "timezone" ON "public"."scheduled_classes" FOR EACH ROW EXECUTE FUNCTION "public"."validate_timezone_column"();



CREATE OR REPLACE TRIGGER "update_auto_renewal_settings_updated_at" BEFORE UPDATE ON "public"."auto_renewal_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_student_subscriptions_updated_at"();



CREATE OR REPLACE TRIGGER "update_referral_codes_updated_at" BEFORE UPDATE ON "public"."referral_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_referral_codes_updated_at"();



CREATE OR REPLACE TRIGGER "update_student_notes_updated_at" BEFORE UPDATE ON "public"."student_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_student_notes_updated_at"();



CREATE OR REPLACE TRIGGER "update_student_subscriptions_updated_at" BEFORE UPDATE ON "public"."student_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_student_subscriptions_updated_at"();



CREATE OR REPLACE TRIGGER "validate_payment_method_trigger" BEFORE INSERT OR UPDATE ON "public"."students" FOR EACH ROW EXECUTE FUNCTION "public"."validate_payment_method"();



ALTER TABLE ONLY "public"."account_audit_log"
    ADD CONSTRAINT "account_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."account_audit_log"
    ADD CONSTRAINT "account_audit_log_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_activity_log"
    ADD CONSTRAINT "admin_activity_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."auto_renewal_settings"
    ADD CONSTRAINT "auto_renewal_settings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_feed_tokens"
    ADD CONSTRAINT "calendar_feed_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_cancellations"
    ADD CONSTRAINT "class_cancellations_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."class_credits_ledger"
    ADD CONSTRAINT "class_credits_ledger_reversed_debit_id_fkey" FOREIGN KEY ("reversed_debit_id") REFERENCES "public"."class_credits_ledger"("id");



ALTER TABLE ONLY "public"."class_credits_ledger"
    ADD CONSTRAINT "class_credits_ledger_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_credits_ledger"
    ADD CONSTRAINT "class_credits_ledger_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."student_subscriptions"("id");



ALTER TABLE ONLY "public"."class_logs"
    ADD CONSTRAINT "class_logs_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."class_logs"
    ADD CONSTRAINT "class_logs_tutor_user_id_fkey" FOREIGN KEY ("tutor_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."class_uploads"
    ADD CONSTRAINT "class_uploads_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."scheduled_classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_methods"
    ADD CONSTRAINT "contact_methods_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_shares"
    ADD CONSTRAINT "content_shares_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_shares"
    ADD CONSTRAINT "content_shares_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guardian_invites"
    ADD CONSTRAINT "guardian_invites_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guardian_invites"
    ADD CONSTRAINT "guardian_invites_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guardian_links"
    ADD CONSTRAINT "guardian_links_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guardian_links"
    ADD CONSTRAINT "guardian_links_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monthly_reports_sent"
    ADD CONSTRAINT "monthly_reports_sent_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."referral_usage"
    ADD CONSTRAINT "referral_usage_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id");



ALTER TABLE ONLY "public"."referral_usage"
    ADD CONSTRAINT "referral_usage_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."role_change_audit"
    ADD CONSTRAINT "role_change_audit_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."scheduled_classes"
    ADD CONSTRAINT "scheduled_classes_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "public"."tutor_student_assigned"("id");



ALTER TABLE ONLY "public"."scheduled_classes"
    ADD CONSTRAINT "scheduled_classes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_classes"
    ADD CONSTRAINT "scheduled_classes_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_subscriptions"
    ADD CONSTRAINT "student_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."student_subscriptions"
    ADD CONSTRAINT "student_subscriptions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tutor_payroll_runs"
    ADD CONSTRAINT "tutor_payroll_runs_tutor_user_id_fkey" FOREIGN KEY ("tutor_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tutor_student_assigned"
    ADD CONSTRAINT "tutor_student_assigned_student_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tutor_student_assigned"
    ADD CONSTRAINT "tutor_student_assigned_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tutor_student_assigned"
    ADD CONSTRAINT "tutor_student_assigned_tutor_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tutor_student_assigned"
    ADD CONSTRAINT "tutor_student_assigned_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can access all class uploads" ON "public"."class_uploads" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can do everything with class_logs" ON "public"."class_logs" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can do everything with content_shares" ON "public"."content_shares" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can do everything with notifications" ON "public"."notifications" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can do everything with profiles" ON "public"."profiles" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can do everything with scheduled_classes" ON "public"."scheduled_classes" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can do everything with student_notes" ON "public"."student_notes" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can do everything with students" ON "public"."students" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can do everything with tutor_student_relationships" ON "public"."tutor_student_assigned" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can do everything with tutors" ON "public"."tutors" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can insert activity log" ON "public"."admin_activity_log" FOR INSERT TO "authenticated" WITH CHECK ((("admin_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can insert monthly reports" ON "public"."monthly_reports_sent" FOR INSERT WITH CHECK ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can manage all auto-renewal settings" ON "public"."auto_renewal_settings" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can manage credit history" ON "public"."class_credits_ledger" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can manage guardian invites" ON "public"."guardian_invites" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can manage guardian links" ON "public"."guardian_links" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can manage payroll runs" ON "public"."tutor_payroll_runs" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can manage referral codes" ON "public"."referral_codes" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can manage subscription plans" ON "public"."subscription_plans" USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can view activity log" ON "public"."admin_activity_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all monthly reports" ON "public"."monthly_reports_sent" FOR SELECT USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can view all overdraw reminders" ON "public"."overdraw_reminders_sent" FOR SELECT USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can view all referral usage" ON "public"."referral_usage" FOR SELECT USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can view class cancellations" ON "public"."class_cancellations" FOR SELECT USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can view contact methods" ON "public"."contact_methods" FOR SELECT USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can view notification preferences" ON "public"."notification_preferences" FOR SELECT USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can view role change audit" ON "public"."role_change_audit" FOR SELECT USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can view the account audit log" ON "public"."account_audit_log" FOR SELECT USING ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text"));



CREATE POLICY "Admins can view webhook events" ON "public"."stripe_webhook_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Allow tutors to insert classes" ON "public"."scheduled_classes" FOR INSERT WITH CHECK (((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") AND ("tutor_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Allow tutors to select students" ON "public"."students" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."tutor_student_assigned" "tsa"
     JOIN "public"."profiles" "tutor_profile" ON (("tsa"."tutor_id" = "tutor_profile"."id")))
     JOIN "public"."profiles" "student_profile" ON (("tsa"."student_id" = "student_profile"."id")))
  WHERE (("tutor_profile"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("student_profile"."email" = "students"."email") AND ("tsa"."active" = true)))));



CREATE POLICY "Guardians can view their own links" ON "public"."guardian_links" FOR SELECT USING (("guardian_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Parents can view their children's class logs" ON "public"."class_logs" FOR SELECT USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'parent'::"text") AND ("student_user_id" IN ( SELECT "public"."my_child_ids"() AS "my_child_ids"))));



CREATE POLICY "Parents can view their children's classes" ON "public"."scheduled_classes" FOR SELECT USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'parent'::"text") AND ("student_id" IN ( SELECT "public"."my_child_ids"() AS "my_child_ids"))));



CREATE POLICY "Parents can view their children's profiles and tutors" ON "public"."profiles" FOR SELECT USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'parent'::"text") AND (("id" IN ( SELECT "public"."my_child_ids"() AS "my_child_ids")) OR (("role" = 'tutor'::"public"."app_role") AND (EXISTS ( SELECT 1
   FROM "public"."tutor_student_assigned" "tsa"
  WHERE (("tsa"."tutor_id" = "profiles"."id") AND ("tsa"."active" = true) AND ("tsa"."student_id" IN ( SELECT "public"."my_child_ids"() AS "my_child_ids")))))))));



CREATE POLICY "Parents can view their children's student records" ON "public"."students" FOR SELECT USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'parent'::"text") AND ("lower"("email") IN ( SELECT "lower"("p"."email") AS "lower"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" IN ( SELECT "public"."my_child_ids"() AS "my_child_ids"))))));



CREATE POLICY "Parents can view their children's tutor assignments" ON "public"."tutor_student_assigned" FOR SELECT USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'parent'::"text") AND ("student_id" IN ( SELECT "public"."my_child_ids"() AS "my_child_ids"))));



CREATE POLICY "Parents can view their family hours history" ON "public"."class_credits_ledger" FOR SELECT USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'parent'::"text") AND ("subscription_id" IN ( SELECT "ss"."id"
   FROM "public"."student_subscriptions" "ss"
  WHERE ("ss"."student_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Participants can read messages" ON "public"."messages" FOR SELECT USING ("public"."can_view_thread"("thread_id"));



CREATE POLICY "Participants can view their conversations" ON "public"."message_threads" FOR SELECT USING ("public"."can_view_thread"("id"));



CREATE POLICY "People can see their own read markers" ON "public"."message_reads" FOR SELECT USING (("profile_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "People can view their own contact methods" ON "public"."contact_methods" FOR SELECT USING (("profile_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "People manage their own notification preferences" ON "public"."notification_preferences" USING (("profile_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("profile_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Referrers can view anonymized usage of their codes" ON "public"."referral_usage" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."referral_codes" "rc"
  WHERE (("rc"."id" = "referral_usage"."referral_code_id") AND ("rc"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Students can access their class uploads" ON "public"."class_uploads" USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'student'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."scheduled_classes" "sc"
  WHERE (("sc"."id" = "class_uploads"."class_id") AND ("sc"."student_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Students can delete their own content shares" ON "public"."content_shares" FOR DELETE USING (("sender_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Students can insert their own auto-renewal settings" ON "public"."auto_renewal_settings" FOR INSERT WITH CHECK ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT "public"."has_guardian"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Students can manage their own content shares" ON "public"."content_shares" FOR UPDATE USING (("sender_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Students can only view their assigned tutors" ON "public"."tutors" FOR SELECT USING ((((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'student'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."tutor_student_assigned" "tsa"
  WHERE (("tsa"."tutor_id" = "tutors"."id") AND ("tsa"."student_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tsa"."active" = true))))) OR ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."email" = "tutors"."email"))))) OR (( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text")));



CREATE POLICY "Students can rate their own class logs" ON "public"."class_logs" FOR UPDATE USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'student'::"text") AND (("Student Name" = "public"."get_auth_user_display_name"()) OR ("Student Name" = "public"."get_auth_user_email"()) OR ("student_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'student'::"text") AND (("Student Name" = "public"."get_auth_user_display_name"()) OR ("Student Name" = "public"."get_auth_user_email"()) OR ("student_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Students can select their own class logs" ON "public"."class_logs" FOR SELECT USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'student'::"text") AND (("Student Name" = "public"."get_auth_user_display_name"()) OR ("Student Name" = "public"."get_auth_user_email"()) OR ("student_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Students can update their own auto-renewal settings" ON "public"."auto_renewal_settings" FOR UPDATE USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT "public"."has_guardian"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Students can view limited tutor profile data" ON "public"."profiles" FOR SELECT USING ((((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'student'::"text") AND (( SELECT "auth"."uid"() AS "uid") = "id")) OR ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'student'::"text") AND ("role" = 'tutor'::"public"."app_role") AND (EXISTS ( SELECT 1
   FROM "public"."tutor_student_assigned" "tsa"
  WHERE (("tsa"."student_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tsa"."tutor_id" = "profiles"."id") AND ("tsa"."active" = true)))))));



CREATE POLICY "Students can view links to themselves" ON "public"."guardian_links" FOR SELECT USING (("student_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Students can view their own auto-renewal settings" ON "public"."auto_renewal_settings" FOR SELECT USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT "public"."has_guardian"(( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Students can view their own invites" ON "public"."guardian_invites" FOR SELECT USING (("student_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Students can view their own monthly reports" ON "public"."monthly_reports_sent" FOR SELECT USING (("student_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Students can view their own overdraw reminders" ON "public"."overdraw_reminders_sent" FOR SELECT USING (("student_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Students can view their own profile" ON "public"."profiles" USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'student'::"text") AND ("id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Students can view their own student record" ON "public"."students" USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'student'::"text") AND ("email" = ( SELECT "profiles"."email"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Tutors can access their class uploads" ON "public"."class_uploads" USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."scheduled_classes" "sc"
  WHERE (("sc"."id" = "class_uploads"."class_id") AND ("sc"."tutor_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Tutors can create their student notes" ON "public"."student_notes" FOR INSERT WITH CHECK (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND ("tutor_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Tutors can delete their classes" ON "public"."scheduled_classes" FOR DELETE USING (("tutor_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Tutors can delete their student notes" ON "public"."student_notes" FOR DELETE USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND ("tutor_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Tutors can edit notes on their own class logs" ON "public"."class_logs" FOR UPDATE USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND (("Tutor Name" = "public"."get_auth_user_display_name"()) OR ("Tutor Name" = "public"."get_auth_user_email"()) OR ("tutor_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Tutors can manage content they share" ON "public"."content_shares" USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND ("sender_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Tutors can select their own class logs" ON "public"."class_logs" FOR SELECT USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND (("Tutor Name" = "public"."get_auth_user_display_name"()) OR ("Tutor Name" = "public"."get_auth_user_email"()) OR ("tutor_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Tutors can update their classes" ON "public"."scheduled_classes" FOR UPDATE USING (("tutor_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Tutors can update their student notes" ON "public"."student_notes" FOR UPDATE USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND ("tutor_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Tutors can view limited student profile data" ON "public"."profiles" FOR SELECT USING ((((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND (( SELECT "auth"."uid"() AS "uid") = "id")) OR ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND ("role" = 'student'::"public"."app_role") AND (EXISTS ( SELECT 1
   FROM "public"."tutor_student_assigned" "tsa"
  WHERE (("tsa"."tutor_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tsa"."student_id" = "profiles"."id") AND ("tsa"."active" = true)))))));



CREATE POLICY "Tutors can view their own payroll runs" ON "public"."tutor_payroll_runs" FOR SELECT USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND ("tutor_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Tutors can view their student notes" ON "public"."student_notes" FOR SELECT USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND ("tutor_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Tutors can view their students' subscription status" ON "public"."student_subscriptions" FOR SELECT USING (((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."tutor_student_assigned" "tsa"
  WHERE (("tsa"."tutor_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tsa"."student_id" = "student_subscriptions"."student_id") AND ("tsa"."active" = true))))));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can read their own calendar feed token" ON "public"."calendar_feed_tokens" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can share content" ON "public"."content_shares" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "sender_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "id") AND (("role")::"text" = ( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role"))));



CREATE POLICY "Users can update viewed status" ON "public"."content_shares" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "receiver_id"));



CREATE POLICY "Users can view content shared with them" ON "public"."content_shares" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "receiver_id") OR (( SELECT "auth"."uid"() AS "uid") = "sender_id")));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can view their own referral codes" ON "public"."referral_codes" FOR SELECT USING (("created_by" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own referral usage" ON "public"."referral_usage" FOR SELECT USING (("used_by_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "View access for student_classes view" ON "public"."scheduled_classes" FOR SELECT USING ((((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'student'::"text") AND ("student_id" = ( SELECT "auth"."uid"() AS "uid"))) OR ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND ("tutor_id" = ( SELECT "auth"."uid"() AS "uid"))) OR (( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text")));



CREATE POLICY "View access for tutor_students view" ON "public"."tutor_student_assigned" FOR SELECT USING ((((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'student'::"text") AND ("student_id" = ( SELECT "auth"."uid"() AS "uid"))) OR ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'tutor'::"text") AND ("tutor_id" = ( SELECT "auth"."uid"() AS "uid"))) OR (( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text")));



ALTER TABLE "public"."account_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_activity_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_full_access_subscriptions" ON "public"."student_subscriptions" USING (((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") AND ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text") OR (("student_id" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT "public"."has_guardian"(( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "admin_or_own_credits_ledger" ON "public"."class_credits_ledger" FOR SELECT USING (((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") AND ((( SELECT "public"."get_auth_user_role"() AS "get_auth_user_role") = 'admin'::"text") OR (("student_id" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT "public"."has_guardian"(( SELECT "auth"."uid"() AS "uid")))))));



COMMENT ON POLICY "admin_or_own_credits_ledger" ON "public"."class_credits_ledger" IS 'Admins see all credits, students see only their own';



CREATE POLICY "authenticated_view_subscription_plans" ON "public"."subscription_plans" FOR SELECT USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



COMMENT ON POLICY "authenticated_view_subscription_plans" ON "public"."subscription_plans" IS 'Restricts plan viewing to authenticated users only';



ALTER TABLE "public"."auto_renewal_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blocked_log_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_feed_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_cancellations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_credits_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_shares" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guardian_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guardian_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monthly_reports_sent" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."overdraw_reminders_sent" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referral_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referral_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_change_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tutor_payroll_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tutor_student_assigned" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tutors" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."class_logs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."class_uploads";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."scheduled_classes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."students";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tutor_student_assigned";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tutors";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





























































































































































































REVOKE ALL ON FUNCTION "public"."accept_guardian_invite"("p_token" "uuid", "p_guardian_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_guardian_invite"("p_token" "uuid", "p_guardian_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_unlink_guardian"("p_student_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_unlink_guardian"("p_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_unlink_guardian"("p_student_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_credit_ledger_entry"("p_student_id" "uuid", "p_subscription_id" "uuid", "p_transaction_type" "text", "p_amount" numeric, "p_reason" "text", "p_related_class_id" "text", "p_invoice_id" "text", "p_dollar_amount" numeric, "p_allow_negative" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_credit_ledger_entry"("p_student_id" "uuid", "p_subscription_id" "uuid", "p_transaction_type" "text", "p_amount" numeric, "p_reason" "text", "p_related_class_id" "text", "p_invoice_id" "text", "p_dollar_amount" numeric, "p_allow_negative" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_create_class_log"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_create_class_log"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_sync_user_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_sync_user_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."become_family_account"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."become_family_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."become_family_account"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."billing_account_for"("p_student_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."billing_account_for"("p_student_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_message_pair"("p_student_id" "uuid", "p_tutor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_message_pair"("p_student_id" "uuid", "p_tutor_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_read_class_file"("p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_read_class_file"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read_class_file"("p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_read_shared_file"("p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_read_shared_file"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read_shared_file"("p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_view_thread"("p_thread_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_view_thread"("p_thread_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_thread"("p_thread_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_write_class_file"("p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_write_class_file"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_write_class_file"("p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_my_guardian_invite"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_my_guardian_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_my_guardian_invite"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_username"("p_username" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_message_alerts"("p_message_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_message_alerts"("p_message_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_id_from_file_path"("p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_id_from_file_path"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_id_from_file_path"("p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."clear_must_change_password"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."clear_must_change_password"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_must_change_password"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_class_atomic"("p_class_id" "uuid", "p_class_number" "text", "p_tutor_name" "text", "p_student_name" "text", "p_date" "date", "p_day" "text", "p_time_cst" "text", "p_time_hrs" "text", "p_subject" "text", "p_content" "text", "p_hw" "text", "p_additional_info" "text", "p_credits_charged" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_class_atomic"("p_class_id" "uuid", "p_class_number" "text", "p_tutor_name" "text", "p_student_name" "text", "p_date" "date", "p_day" "text", "p_time_cst" "text", "p_time_hrs" "text", "p_subject" "text", "p_content" "text", "p_hw" "text", "p_additional_info" "text", "p_credits_charged" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_class_atomic"("p_class_id" "uuid", "p_class_number" "text", "p_tutor_name" "text", "p_student_name" "text", "p_date" "date", "p_day" "text", "p_time_cst" "text", "p_time_hrs" "text", "p_subject" "text", "p_content" "text", "p_hw" "text", "p_additional_info" "text", "p_credits_charged" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."convert_account_to_family"("p_account_id" "uuid", "p_child_id" "uuid", "p_parent_first_name" "text", "p_parent_last_name" "text", "p_dry_run" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."convert_account_to_family"("p_account_id" "uuid", "p_child_id" "uuid", "p_parent_first_name" "text", "p_parent_last_name" "text", "p_dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_account_to_family"("p_account_id" "uuid", "p_child_id" "uuid", "p_parent_first_name" "text", "p_parent_last_name" "text", "p_dry_run" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_guardian_invite"("p_student_id" "uuid", "p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_guardian_invite"("p_student_id" "uuid", "p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."demote_tutor_to_student"("tutor_user_id" "uuid", "reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."demote_tutor_to_student"("tutor_user_id" "uuid", "reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."demote_tutor_to_student"("tutor_user_id" "uuid", "reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_class_logs_update_columns"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_class_logs_update_columns"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_class_notifications"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_class_notifications"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_username"("p_first" "text", "p_last" "text", "p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_username"("p_first" "text", "p_last" "text", "p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_at_risk_students"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_at_risk_students"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_at_risk_students"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_user_display_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_display_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_display_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_user_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_child_calendar_feed_token"("p_student_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_child_calendar_feed_token"("p_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_child_calendar_feed_token"("p_student_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_class_log_totals"("p_search" "text", "p_date" "date", "p_payment_filter" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_class_log_totals"("p_search" "text", "p_date" "date", "p_payment_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_class_log_totals"("p_search" "text", "p_date" "date", "p_payment_filter" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_family_hours_history"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_family_hours_history"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_family_hours_history"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_messageable_pairs"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_messageable_pairs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_messageable_pairs"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_calendar_feed_token"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_calendar_feed_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_calendar_feed_token"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_children"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_children"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_children"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_family_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_family_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_family_status"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_hours_activity"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_hours_activity"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_hours_activity"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_payroll_history"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_payroll_history"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_payroll_history"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_pending_guardian_invites"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_pending_guardian_invites"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_pending_guardian_invites"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_threads"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_threads"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_threads"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_or_create_thread"("p_student_id" "uuid", "p_tutor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_or_create_thread"("p_student_id" "uuid", "p_tutor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_thread"("p_student_id" "uuid", "p_tutor_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_referral_code"("p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_referral_code"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_referral_code"("p_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_referral_usage_stats"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_referral_usage_stats"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_referral_usage_stats"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_classes"("requesting_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_classes"("requesting_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_classes"("requesting_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_student_credit_balance"("p_student_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_student_credit_balance"("p_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_credit_balance"("p_student_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_student_login_status"("p_student_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_student_login_status"("p_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_login_status"("p_student_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_students_credit_summary"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_students_credit_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_students_credit_summary"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_thread_messages"("p_thread_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_thread_messages"("p_thread_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_thread_messages"("p_thread_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_thread_participants"("p_thread_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_thread_participants"("p_thread_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_thread_participants"("p_thread_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_tomorrow_scheduled_classes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_tomorrow_scheduled_classes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_tutor_student_relationships"("tutor_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_tutor_student_relationships"("tutor_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tutor_student_relationships"("tutor_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tutor_students_by_email"("requesting_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tutor_students_by_email"("requesting_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tutor_students_by_email"("requesting_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_tutor_unpaid_summary"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_tutor_unpaid_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tutor_unpaid_summary"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_unread_message_count"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_unread_message_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_message_count"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_zero_credit_upcoming_students"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_zero_credit_upcoming_students"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_zero_credit_upcoming_students"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guardian_of"("p_student_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guardian_of"("p_student_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_rest_get_ics"("request" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_rest_get_ics"("request" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_rest_get_ics"("request" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_guardian"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_guardian"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_guardian"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_guardian"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_student_history"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_student_history"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_class_participant"("p_class_id" "uuid", "p_include_parent" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_class_participant"("p_class_id" "uuid", "p_include_parent" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_class_participant"("p_class_id" "uuid", "p_include_parent" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_guardian_of"("p_student_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_guardian_of"("p_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_guardian_of"("p_student_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_class_cancellation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_class_cancellation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_critical_security_event"("event_type" "text", "user_id" "uuid", "details" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_critical_security_event"("event_type" "text", "user_id" "uuid", "details" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_enhanced_security_event"("operation_type" "text", "target_table" "text", "row_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_enhanced_security_event"("operation_type" "text", "target_table" "text", "row_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."login_email_for_username"("p_username" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."login_email_for_username"("p_username" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_thread_read"("p_thread_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_thread_read"("p_thread_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_thread_read"("p_thread_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."my_child_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."my_child_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_child_ids"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notification_target_for"("p_profile_id" "uuid", "p_category" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notification_target_for"("p_profile_id" "uuid", "p_category" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notification_targets"("p_student_id" "uuid", "p_category" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notification_targets"("p_student_id" "uuid", "p_category" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."post_message"("p_thread_id" "uuid", "p_body" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."post_message"("p_thread_id" "uuid", "p_body" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."post_message"("p_thread_id" "uuid", "p_body" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."profiles_parent_controls_guard"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."profiles_parent_controls_guard"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."profiles_username_guard"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."profiles_username_guard"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."promote_student_to_tutor"("student_user_id" "uuid", "reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."promote_student_to_tutor"("student_user_id" "uuid", "reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."promote_student_to_tutor"("student_user_id" "uuid", "reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_managed_student"("p_guardian_id" "uuid", "p_student_id" "uuid", "p_grade" "text", "p_notification_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_managed_student"("p_guardian_id" "uuid", "p_student_id" "uuid", "p_grade" "text", "p_notification_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."require_admin_access"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."require_admin_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."require_admin_access"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reverse_class_debit"("p_student_id" "uuid", "p_class_id" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reverse_class_debit"("p_student_id" "uuid", "p_class_id" "text", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rotate_child_calendar_feed_token"("p_student_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rotate_child_calendar_feed_token"("p_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rotate_child_calendar_feed_token"("p_student_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rotate_my_calendar_feed_token"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rotate_my_calendar_feed_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rotate_my_calendar_feed_token"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_my_username"("p_username" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_my_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_my_username"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_stripe_webhook_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_stripe_webhook_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_stripe_webhook_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_student_hours_visibility"("p_student_id" "uuid", "p_visible" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_student_hours_visibility"("p_student_id" "uuid", "p_visible" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_student_hours_visibility"("p_student_id" "uuid", "p_visible" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."student_notification_recipients"("p_student_id" "uuid", "p_category" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."student_notification_recipients"("p_student_id" "uuid", "p_category" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_profile_name_from_roster"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_profile_name_from_roster"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_roster_name_from_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_roster_name_from_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_scheduled_class_times"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_scheduled_class_times"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_scheduled_class_times"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_subscription_credits"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_subscription_credits"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_user_roles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_user_roles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."thread_role"("p_thread_id" "uuid", "p_profile_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."thread_role"("p_thread_id" "uuid", "p_profile_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_my_child"("p_student_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_grade" "text", "p_notification_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_my_child"("p_student_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_grade" "text", "p_notification_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_my_child"("p_student_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_grade" "text", "p_notification_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_referral_codes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_referral_codes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_referral_codes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_student_notes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_student_notes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_student_notes_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_student_subscriptions_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_student_subscriptions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."username_problem"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."username_problem"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."username_problem"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_payment_method"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_payment_method"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_payment_method"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_role_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_role_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_timezone_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_timezone_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_timezone_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."account_audit_log" TO "service_role";
GRANT SELECT ON TABLE "public"."account_audit_log" TO "authenticated";



GRANT ALL ON TABLE "public"."admin_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."auto_renewal_settings" TO "anon";
GRANT ALL ON TABLE "public"."auto_renewal_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."auto_renewal_settings" TO "service_role";



GRANT ALL ON TABLE "public"."blocked_log_notifications" TO "anon";
GRANT ALL ON TABLE "public"."blocked_log_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_log_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_feed_tokens" TO "anon";
GRANT ALL ON TABLE "public"."calendar_feed_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_feed_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."class_cancellations" TO "anon";
GRANT ALL ON TABLE "public"."class_cancellations" TO "authenticated";
GRANT ALL ON TABLE "public"."class_cancellations" TO "service_role";



GRANT ALL ON TABLE "public"."class_credits_ledger" TO "anon";
GRANT ALL ON TABLE "public"."class_credits_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."class_credits_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."class_logs" TO "anon";
GRANT ALL ON TABLE "public"."class_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."class_logs" TO "service_role";



GRANT ALL ON TABLE "public"."class_uploads" TO "anon";
GRANT ALL ON TABLE "public"."class_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."class_uploads" TO "service_role";



GRANT ALL ON TABLE "public"."contact_methods" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."contact_methods" TO "authenticated";



GRANT SELECT("profile_id") ON TABLE "public"."contact_methods" TO "authenticated";



GRANT SELECT("kind") ON TABLE "public"."contact_methods" TO "authenticated";



GRANT SELECT("value") ON TABLE "public"."contact_methods" TO "authenticated";



GRANT SELECT("verified_at") ON TABLE "public"."contact_methods" TO "authenticated";



GRANT SELECT("opted_in_at") ON TABLE "public"."contact_methods" TO "authenticated";



GRANT SELECT("opted_out_at") ON TABLE "public"."contact_methods" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."contact_methods" TO "authenticated";



GRANT ALL ON TABLE "public"."content_shares" TO "anon";
GRANT ALL ON TABLE "public"."content_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."content_shares" TO "service_role";



GRANT ALL ON TABLE "public"."student_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."student_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."student_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."credit_discrepancies" TO "anon";
GRANT ALL ON TABLE "public"."credit_discrepancies" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_discrepancies" TO "service_role";



GRANT ALL ON TABLE "public"."guardian_invites" TO "service_role";
GRANT SELECT ON TABLE "public"."guardian_invites" TO "authenticated";



GRANT ALL ON TABLE "public"."guardian_links" TO "service_role";
GRANT SELECT ON TABLE "public"."guardian_links" TO "authenticated";



GRANT ALL ON TABLE "public"."message_reads" TO "service_role";
GRANT SELECT ON TABLE "public"."message_reads" TO "authenticated";



GRANT ALL ON TABLE "public"."message_threads" TO "service_role";
GRANT SELECT ON TABLE "public"."message_threads" TO "authenticated";



GRANT ALL ON TABLE "public"."messages" TO "service_role";
GRANT SELECT ON TABLE "public"."messages" TO "authenticated";



GRANT ALL ON TABLE "public"."monthly_reports_sent" TO "anon";
GRANT ALL ON TABLE "public"."monthly_reports_sent" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_reports_sent" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."overdraw_reminders_sent" TO "anon";
GRANT ALL ON TABLE "public"."overdraw_reminders_sent" TO "authenticated";
GRANT ALL ON TABLE "public"."overdraw_reminders_sent" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."referral_codes" TO "anon";
GRANT ALL ON TABLE "public"."referral_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_codes" TO "service_role";



GRANT ALL ON TABLE "public"."referral_usage" TO "anon";
GRANT ALL ON TABLE "public"."referral_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_usage" TO "service_role";



GRANT ALL ON TABLE "public"."role_change_audit" TO "anon";
GRANT ALL ON TABLE "public"."role_change_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."role_change_audit" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_classes" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_classes" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."student_notes" TO "anon";
GRANT ALL ON TABLE "public"."student_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."student_notes" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."tutor_payroll_runs" TO "anon";
GRANT ALL ON TABLE "public"."tutor_payroll_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."tutor_payroll_runs" TO "service_role";



GRANT ALL ON TABLE "public"."tutor_student_assigned" TO "anon";
GRANT ALL ON TABLE "public"."tutor_student_assigned" TO "authenticated";
GRANT ALL ON TABLE "public"."tutor_student_assigned" TO "service_role";



GRANT ALL ON TABLE "public"."tutors" TO "anon";
GRANT ALL ON TABLE "public"."tutors" TO "authenticated";
GRANT ALL ON TABLE "public"."tutors" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";
































-- ─── Objects in Supabase-managed schemas ────────────────────────────────────
SET search_path = public, extensions;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('avatars', 'avatars', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('class-materials', 'class-materials', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('db-backups', 'Database Backups', false, 104857600, '{application/json}'::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('materials', 'materials', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('shared_content', 'shared_content', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Admins can access all class materials" ON storage.objects AS PERMISSIVE FOR ALL TO public USING (((bucket_id = 'class-materials'::text) AND (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::app_role)));
CREATE POLICY "Admins can read backup files" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING (((bucket_id = 'db-backups'::text) AND (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::app_role)));
CREATE POLICY "Admins can upload backup files" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'db-backups'::text) AND (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::app_role)));
CREATE POLICY "Anyone can update their own avatar" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'avatars'::text) AND (auth.uid() = owner)));
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'avatars'::text));
CREATE POLICY "Avatars: upload your own" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND (name ~~ ((( SELECT auth.uid() AS uid))::text || '-%'::text))));
CREATE POLICY "Class files: own folder or own classes" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'materials'::text) AND can_write_class_file(name)));
CREATE POLICY "Class files: participants can read" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'materials'::text) AND can_read_class_file(name)));
CREATE POLICY "Class files: uploader, class tutor or admin can delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'materials'::text) AND ((owner_id = (( SELECT auth.uid() AS uid))::text) OR can_write_class_file(name))));
CREATE POLICY "Shared files: sender, receiver or admin can read" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'shared_content'::text) AND can_read_shared_file(name)));
CREATE POLICY "Shared files: upload to your own folder" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'shared_content'::text) AND (split_part(name, '/'::text, 1) = (( SELECT auth.uid() AS uid))::text)));
CREATE POLICY "Students can delete their uploads" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'class-materials'::text) AND (EXISTS ( SELECT 1
   FROM (class_uploads cu
     JOIN scheduled_classes sc ON ((cu.class_id = sc.id)))
  WHERE ((cu.file_path = objects.name) AND ((sc.student_id = auth.uid()) OR (sc.tutor_id = auth.uid())))))));
CREATE POLICY "Students can update their uploads" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'class-materials'::text) AND (EXISTS ( SELECT 1
   FROM (class_uploads cu
     JOIN scheduled_classes sc ON ((cu.class_id = sc.id)))
  WHERE ((cu.file_path = objects.name) AND ((sc.student_id = auth.uid()) OR (sc.tutor_id = auth.uid())))))));
CREATE POLICY "Students can view their class materials" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING (((bucket_id = 'class-materials'::text) AND (EXISTS ( SELECT 1
   FROM (class_uploads cu
     JOIN scheduled_classes sc ON ((cu.class_id = sc.id)))
  WHERE ((cu.file_path = objects.name) AND ((sc.student_id = auth.uid()) OR (sc.tutor_id = auth.uid())))))));

RESET search_path;
