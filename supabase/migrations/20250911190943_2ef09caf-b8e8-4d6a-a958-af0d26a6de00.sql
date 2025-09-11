-- Create student_notes table for tutors to track notes about students
CREATE TABLE public.student_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for tutors to manage their student notes
CREATE POLICY "Tutors can view their student notes" 
ON public.student_notes 
FOR SELECT 
USING (
  get_auth_user_role() = 'tutor' AND tutor_id = auth.uid()
);

CREATE POLICY "Tutors can create their student notes" 
ON public.student_notes 
FOR INSERT 
WITH CHECK (
  get_auth_user_role() = 'tutor' AND tutor_id = auth.uid()
);

CREATE POLICY "Tutors can update their student notes" 
ON public.student_notes 
FOR UPDATE 
USING (
  get_auth_user_role() = 'tutor' AND tutor_id = auth.uid()
);

CREATE POLICY "Tutors can delete their student notes" 
ON public.student_notes 
FOR DELETE 
USING (
  get_auth_user_role() = 'tutor' AND tutor_id = auth.uid()
);

-- Admin access
CREATE POLICY "Admins can do everything with student_notes" 
ON public.student_notes 
FOR ALL 
USING (get_auth_user_role() = 'admin');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_student_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_student_notes_updated_at
BEFORE UPDATE ON public.student_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_student_notes_updated_at();