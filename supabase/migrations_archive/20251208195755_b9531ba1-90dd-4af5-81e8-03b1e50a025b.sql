-- Create table to track overdraw reminder emails sent
CREATE TABLE public.overdraw_reminders_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  threshold INTEGER NOT NULL,
  amount_owed NUMERIC NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.overdraw_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Admin can view all reminders
CREATE POLICY "Admins can view all overdraw reminders"
ON public.overdraw_reminders_sent
FOR SELECT
USING (get_auth_user_role() = 'admin');

-- Students can view their own reminders
CREATE POLICY "Students can view their own overdraw reminders"
ON public.overdraw_reminders_sent
FOR SELECT
USING (student_id = auth.uid());

-- Create index for efficient lookups
CREATE INDEX idx_overdraw_reminders_student_threshold 
ON public.overdraw_reminders_sent(student_id, threshold);