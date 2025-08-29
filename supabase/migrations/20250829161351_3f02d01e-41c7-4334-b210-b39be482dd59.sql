-- Fix security issues by setting proper search path
CREATE OR REPLACE FUNCTION public.auto_create_class_log()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create class log if status changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
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
  
  RETURN NEW;
END;
$$;