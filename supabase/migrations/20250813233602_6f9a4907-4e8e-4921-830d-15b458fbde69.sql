-- Enable RLS on student_classes table if not already enabled
ALTER TABLE public.student_classes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for student_classes table
CREATE POLICY "Admins can access all student classes" 
ON public.student_classes 
FOR ALL 
USING (get_auth_user_role() = 'admin');

CREATE POLICY "Students can view their own classes" 
ON public.student_classes 
FOR SELECT 
USING (
  get_auth_user_role() = 'student' AND student_id = auth.uid()
);

CREATE POLICY "Tutors can view classes they teach" 
ON public.student_classes 
FOR SELECT 
USING (
  get_auth_user_role() = 'tutor' AND tutor_id = auth.uid()
);

-- Enable RLS on tutor_students table if not already enabled
ALTER TABLE public.tutor_students ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tutor_students table
CREATE POLICY "Admins can access all tutor-student relationships" 
ON public.tutor_students 
FOR ALL 
USING (get_auth_user_role() = 'admin');

CREATE POLICY "Students can view their own relationships" 
ON public.tutor_students 
FOR SELECT 
USING (
  get_auth_user_role() = 'student' AND student_id = auth.uid()
);

CREATE POLICY "Tutors can view their assigned students" 
ON public.tutor_students 
FOR SELECT 
USING (
  get_auth_user_role() = 'tutor' AND tutor_id = auth.uid()
);