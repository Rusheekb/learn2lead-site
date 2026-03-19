-- Add 24h reminder tracking to scheduled_classes
ALTER TABLE public.scheduled_classes
ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean DEFAULT false;

-- Add index for efficient 24h reminder queries
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_24h_reminder 
ON public.scheduled_classes (date, reminder_24h_sent) 
WHERE reminder_24h_sent = false;