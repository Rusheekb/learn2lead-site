
-- Add RLS policies for students to view their scheduled classes
ALTER TABLE IF EXISTS public.scheduled_classes ENABLE ROW LEVEL SECURITY;

-- Create policy for students to view their own scheduled classes
CREATE POLICY IF NOT EXISTS "Students can view their scheduled classes" 
ON public.scheduled_classes 
FOR SELECT 
USING (student_id = auth.uid());

-- Create policy for tutors to view classes they teach
CREATE POLICY IF NOT EXISTS "Tutors can view classes they teach" 
ON public.scheduled_classes 
FOR SELECT 
USING (tutor_id = auth.uid());
