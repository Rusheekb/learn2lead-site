-- Backfill Title column for existing class logs
-- Use Subject as fallback title for records where Title is null
UPDATE public.class_logs 
SET "Title" = COALESCE("Subject", 'Class Session')
WHERE "Title" IS NULL;