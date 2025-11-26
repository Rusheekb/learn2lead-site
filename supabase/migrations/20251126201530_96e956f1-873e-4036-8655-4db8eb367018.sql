-- Fix function search_path security issue
-- The update_student_subscriptions_updated_at function is missing the search_path setting

CREATE OR REPLACE FUNCTION public.update_student_subscriptions_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;