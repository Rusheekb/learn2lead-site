
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
    const { error } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (error) {
      toast.error(error.message);
      throw error;
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
