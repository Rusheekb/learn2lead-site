
-- Create trigger for new user profile creation

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert profile data with basic role assignment
    INSERT INTO public.profiles (
        id, 
        email, 
        role,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        new.email,
        CASE 
            WHEN new.email LIKE '%@learn2lead.com' THEN 'tutor'::app_role
            ELSE 'student'::app_role
        END,
        now(),
        now()
    );
    
    RETURN new;
END;
$$;

-- Create trigger to handle new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
