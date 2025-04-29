
-- Add Row Level Security policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_student_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_uploads ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (get_auth_user_role() = 'admin');

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (get_auth_user_role() = 'admin');

-- Students policies
CREATE POLICY "Admins can manage students"
ON public.students
FOR ALL
USING (get_auth_user_role() = 'admin');

CREATE POLICY "Tutors can view their assigned students"
ON public.students
FOR SELECT
USING (
  get_auth_user_role() = 'tutor' AND
  EXISTS (
    SELECT 1 FROM public.tutor_student_relationships
    WHERE student_id = students.id AND tutor_id = auth.uid()
  )
);

-- Tutors policies
CREATE POLICY "Admins can manage tutors"
ON public.tutors
FOR ALL
USING (get_auth_user_role() = 'admin');

CREATE POLICY "Tutors can view their own profile"
ON public.tutors
FOR SELECT
USING (id = auth.uid() AND get_auth_user_role() = 'tutor');

-- Class logs policies
CREATE POLICY "Admins can manage class logs"
ON public.class_logs
FOR ALL
USING (get_auth_user_role() = 'admin');

CREATE POLICY "Tutors can view their own classes"
ON public.class_logs
FOR SELECT
USING (
  get_auth_user_role() = 'tutor' AND
  "Tutor Name" = (SELECT name FROM public.tutors WHERE id = auth.uid())
);

CREATE POLICY "Students can view their own classes"
ON public.class_logs
FOR SELECT
USING (
  get_auth_user_role() = 'student' AND
  "Student Name" = (SELECT name FROM public.students WHERE id = auth.uid())
);
