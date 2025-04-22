import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Signs in a user using Supabase email/password authentication.
 */
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success('Signed in successfully!');
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

/**
 * Signs up a user and ensures a profile row exists in the `profiles` table,
 * with default role 'student'.
 */
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const { data: signupData, error: signupError } = await supabase.auth.signUp(
      {
        email,
        password,
      }
    );
    if (signupError) {
      toast.error(signupError.message);
      throw signupError;
    }

    // Guarantee a profile row exists immediately after signup
    const user = signupData.user;
    if (user && user.email) {
      // See if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Insert profile for this user, always default to 'student'
        const role = 'student';
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: user.id, email: user.email, role }]);
        if (insertError) {
          toast.error('Failed to create user profile.');
          throw insertError;
        }
      }
    }

    toast.success(
      'Signed up successfully! Please check your email for verification.'
    );
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

/**
 * Signs out the current user.
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to sign out');
      return false;
    }
    toast.success('Signed out successfully');
    return true;
  } catch (error) {
    toast.error('Failed to sign out');
    return false;
  }
};
