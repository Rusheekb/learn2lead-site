-- Add Title column to class_logs table
ALTER TABLE public.class_logs 
ADD COLUMN IF NOT EXISTS "Title" text;

-- Add comment for documentation
COMMENT ON COLUMN public.class_logs."Title" IS 'Descriptive class title from the scheduled class, separate from the unique Class Number ID';