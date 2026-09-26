-- Google OAuth signups were landing with blank first_name/last_name.
-- handle_new_user_profile() only ever looked for raw_user_meta_data's
-- 'first_name'/'last_name' keys, which the email/password signup form sets
-- but Google OAuth never does (Google sends 'full_name'/'name'/
-- 'given_name'/'family_name' instead) - so every Google signup silently got
-- empty strings, and every COALESCE(first_name/last_name, email) fallback
-- throughout the app (complete_class_atomic, admin lists, etc.) displayed
-- the raw email as the person's name instead. This is why an admin couldn't
-- tell who 447bills@gmail.com was - Google actually sent
-- "Viaan-Home Brahmbhatt" as the name, the trigger just never looked at it.
--
-- Also removes the trigger's dead @learn2lead.com -> auto-tutor-role logic.
-- The client side already stopped doing this (see AuthProvider.tsx comment)
-- since the business doesn't own that domain, but the DB trigger - which
-- always wins the race since it fires synchronously during the auth.users
-- insert, before any client code runs - still had it live. Left in place,
-- anyone signing up with an @learn2lead.com address would be instantly
-- granted the tutor role with zero admin review.

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
      'student'::app_role, -- every signup lands as student; admin promotes tutors manually
      now(),
      now()
  );

  RETURN new;
END;
$function$;

-- One-time backfill for the 5 accounts already affected, using each
-- account's own real signup metadata (or, for the 2 known internal
-- test/dev fixtures with no OAuth metadata at all, their email's local
-- part) so the constraint below can be added without breaking on existing
-- rows.
UPDATE public.profiles SET first_name = 'Viaan-Home', last_name = 'Brahmbhatt'
  WHERE id = '5dd34b35-8024-49f7-844d-eff6e42ac4ad'; -- 447bills@gmail.com
UPDATE public.profiles SET first_name = 'Agastya', last_name = 'Kuluvalli'
  WHERE id = '02c0a127-8c8f-4891-abb7-63819adbd81f'; -- agastya.kuluvalli@gmail.com
UPDATE public.profiles SET first_name = 'Arnav', last_name = 'Bajjuri'
  WHERE id = 'c2b7c63b-1dfa-484e-896d-735c490f9a9b'; -- abajjuri@gmail.com
UPDATE public.profiles SET first_name = 'bar'
  WHERE id = '90050b58-fc48-4c48-974b-e8bb0cd13e28'; -- bar@gmail.com, known test account
UPDATE public.profiles SET first_name = 'foo'
  WHERE id = '9c9ef497-2fc1-4565-aa1f-5888a165a2fa'; -- foo@learn2lead.com, known test account

-- Defense in depth: require a non-blank first_name at the DB level, so no
-- future write path (including ones that bypass client-side/OAuth flows
-- entirely) can silently create a nameless profile again. NOT NULL alone
-- wouldn't catch this - Postgres CHECK constraints treat NULL as
-- satisfying the check, so both are needed together to actually block
-- empty strings as well as NULLs. last_name is deliberately left
-- unconstrained since some real OAuth accounts legitimately provide only
-- a single name.
ALTER TABLE public.profiles
  ALTER COLUMN first_name SET NOT NULL,
  ADD CONSTRAINT profiles_first_name_not_blank CHECK (trim(first_name) <> '');
