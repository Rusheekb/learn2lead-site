
ALTER TABLE public.students
ADD COLUMN payment_method text DEFAULT 'zelle';

-- Add check constraint separately using a validation trigger for flexibility
CREATE OR REPLACE FUNCTION public.validate_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_method IS NOT NULL AND NEW.payment_method NOT IN ('stripe', 'zelle') THEN
    RAISE EXCEPTION 'payment_method must be either stripe or zelle';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_payment_method_trigger
BEFORE INSERT OR UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.validate_payment_method();
