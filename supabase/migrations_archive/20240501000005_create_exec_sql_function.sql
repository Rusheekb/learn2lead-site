
-- Create a SQL execution function (only accessible by authenticated admins)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function should only be used during migrations or by admins
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Only admin users can execute SQL commands';
  END IF;
  
  EXECUTE sql;
END;
$$;

-- Set permissions on the function
REVOKE ALL ON FUNCTION public.exec_sql FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_sql TO authenticated;

