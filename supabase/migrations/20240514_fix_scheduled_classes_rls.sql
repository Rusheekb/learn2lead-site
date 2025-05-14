
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

-- Create policy for tutors to insert classes 
CREATE POLICY IF NOT EXISTS "Tutors can create classes" 
ON public.scheduled_classes 
FOR INSERT 
WITH CHECK (tutor_id = auth.uid());

-- Create policy for tutors to update classes they teach
CREATE POLICY IF NOT EXISTS "Tutors can update their classes" 
ON public.scheduled_classes 
FOR UPDATE 
USING (tutor_id = auth.uid());

-- Create policy for tutors to delete classes they teach
CREATE POLICY IF NOT EXISTS "Tutors can delete their classes" 
ON public.scheduled_classes 
FOR DELETE 
USING (tutor_id = auth.uid());
