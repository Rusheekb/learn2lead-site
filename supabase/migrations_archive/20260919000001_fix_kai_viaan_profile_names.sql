-- Parents accidentally used their own name at signup for two students.
-- Admin corrected students.name via the table editor ("Kai" / "Viaan"),
-- but class_logs, the calendar, and search all derive the display name
-- from profiles.first_name/last_name (see complete_class_atomic), which
-- is set once at signup and never re-synced from students.name. Fixing
-- the actual source so future class logs and the calendar show the
-- right name instead of the parent's.

UPDATE public.profiles
SET first_name = 'Viaan', last_name = 'Barot'
WHERE id = '66424c0b-7e4e-4574-b082-352a2fe7d81e'; -- sid7barot@gmail.com

UPDATE public.profiles
SET first_name = 'Kai', last_name = 'Giorgio'
WHERE id = 'b706485c-c137-4f9d-ae07-152dc8e1ce76'; -- constanza_gm@icloud.com
