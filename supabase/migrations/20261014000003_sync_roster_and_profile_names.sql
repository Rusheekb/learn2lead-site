-- Keep the roster names (students.name / tutors.name, shown in the admin
-- directory) in sync with profiles.first_name/last_name (used by class logs,
-- calendars, emails and search). They were only ever copied once at signup,
-- so a rename in one place never reached the other — e.g. renaming a student
-- in the table editor left their class logs under the parent's name.
--
-- profiles is the source of truth:
--   * profile name change  -> roster name follows
--   * roster rename        -> profile follows (first word -> first_name, rest
--     -> last_name; a single-word rename only changes first_name so a last
--     name is never wiped; email-looking values are ignored)
-- pg_trigger_depth() stops the two triggers from re-firing each other.
-- Rows are matched by email, the stable link between the tables.

CREATE OR REPLACE FUNCTION public.sync_roster_name_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE TRIGGER trg_sync_roster_name_from_profile
  AFTER UPDATE OF first_name, last_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_roster_name_from_profile();

CREATE OR REPLACE FUNCTION public.sync_profile_name_from_roster()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE TRIGGER trg_sync_profile_name_from_student
  AFTER UPDATE OF name ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_name_from_roster();

CREATE TRIGGER trg_sync_profile_name_from_tutor
  AFTER UPDATE OF name ON public.tutors
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_name_from_roster();

-- One-time backfill: roster names that drifted from (or never got) the
-- profile name — e.g. "Kai" / "Viaan" after table-editor renames, and
-- tutors/students whose roster name was still their email address. The
-- reverse trigger fires on these updates but sees the roster name now equals
-- the profile name, so it changes nothing.
UPDATE public.students s
SET name = TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')))
FROM public.profiles p
WHERE lower(p.email) = lower(s.email)
  AND TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) <> ''
  AND s.name IS DISTINCT FROM TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')));

UPDATE public.tutors t
SET name = TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')))
FROM public.profiles p
WHERE lower(p.email) = lower(t.email)
  AND TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) <> ''
  AND t.name IS DISTINCT FROM TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')));
