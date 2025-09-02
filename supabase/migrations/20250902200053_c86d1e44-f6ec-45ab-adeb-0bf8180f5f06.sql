-- First, let's check if the trigger exists and make sure it's properly set up
DROP TRIGGER IF EXISTS auto_create_class_log_trigger ON public.scheduled_classes;

-- Create the trigger to auto-create class logs when classes are completed
CREATE OR REPLACE FUNCTION public.auto_create_class_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create class log if status changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Check if a class log already exists for this class
    IF NOT EXISTS (SELECT 1 FROM public.class_logs WHERE "Class ID" = NEW.id::text) THEN
      INSERT INTO public.class_logs (
        "Class Number",
        "Tutor Name", 
        "Student Name",
        "Date",
        "Day",
        "Time (CST)",
        "Time (hrs)",
        "Subject",
        "Content",
        "HW",
        "Class ID",
        "Additional Info",
        "Student Payment",
        "Tutor Payment"
      )
      SELECT 
        NEW.title,
        COALESCE(tp.first_name || ' ' || tp.last_name, tp.email, 'Unknown Tutor'),
        COALESCE(sp.first_name || ' ' || sp.last_name, sp.email, 'Unknown Student'),
        NEW.date,
        to_char(NEW.date, 'Day'),
        NEW.start_time::text,
        EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))/3600,
        NEW.subject,
        NEW.notes,
        NULL, -- HW will be added later by tutor
        NEW.id::text,
        CASE 
          WHEN NEW.attendance IS NOT NULL THEN 'Attendance: ' || NEW.attendance
          ELSE NULL
        END,
        'Pending',
        'Pending'
      FROM public.profiles tp, public.profiles sp
      WHERE tp.id = NEW.tutor_id AND sp.id = NEW.student_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER auto_create_class_log_trigger
  AFTER UPDATE ON public.scheduled_classes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_class_log();