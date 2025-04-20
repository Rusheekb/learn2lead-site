import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
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

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    // 1) Sign up the user
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (signupError) {
      toast.error(signupError.message);
      throw signupError;
    }
    
    // 2) Insert profile row with role based on email domain
    const user = signupData.user;
    if (user && user.email) {
      const role = user.email.endsWith('@learn2lead.com') ? 'tutor' : 'student';
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            email: user.email,
            role,
          }
        ]);
      
      if (profileError) {
        toast.error('Failed to create user profile.');
        console.error('Profile insert error:', profileError);
        throw profileError;
      }
    }
    
    toast.success('Signed up successfully! Please check your email for verification.');
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
      return false;
    }
    
    toast.success('Signed out successfully');
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    toast.error('Failed to sign out');
    return false;
  }
};
