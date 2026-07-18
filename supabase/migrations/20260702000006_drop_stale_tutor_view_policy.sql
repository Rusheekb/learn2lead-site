-- "Tutors can view their own class logs" is a strict subset of
-- "Tutors can select their own class logs" (uuid-only vs uuid+name+email).
-- The broader policy was added in the RLS cleanup migration; the old one is now redundant.
DROP POLICY IF EXISTS "Tutors can view their own class logs" ON public.class_logs;
