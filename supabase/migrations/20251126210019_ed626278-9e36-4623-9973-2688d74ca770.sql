-- Create monthly_reports_sent table to track sent reports
CREATE TABLE IF NOT EXISTS public.monthly_reports_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_month DATE NOT NULL, -- First day of the month being reported
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  report_content TEXT, -- Optional: store HTML content for history
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_monthly_reports_student_month ON public.monthly_reports_sent(student_id, report_month DESC);

-- Enable RLS
ALTER TABLE public.monthly_reports_sent ENABLE ROW LEVEL SECURITY;

-- Admins can view all reports
CREATE POLICY "Admins can view all monthly reports"
ON public.monthly_reports_sent
FOR SELECT
USING (get_auth_user_role() = 'admin');

-- Admins can insert reports
CREATE POLICY "Admins can insert monthly reports"
ON public.monthly_reports_sent
FOR INSERT
WITH CHECK (get_auth_user_role() = 'admin');

-- Students can view their own reports
CREATE POLICY "Students can view their own monthly reports"
ON public.monthly_reports_sent
FOR SELECT
USING (student_id = auth.uid());

-- Add comment for documentation
COMMENT ON TABLE public.monthly_reports_sent IS 'Tracks monthly progress reports sent to students via email';