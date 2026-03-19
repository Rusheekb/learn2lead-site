
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addBreadcrumb, captureException } from '@/lib/sentry';
import { logger } from '@/lib/logger';

const log = logger.create('authActions');

/**
 * Signs in a user using Supabase email/password authentication.
 */
export const signInWithEmail = async (email: string, password: string) => {
  addBreadcrumb({
    category: 'auth',
    message: 'Sign-in attempt',
    level: 'info',
    data: { method: 'email' },
  });

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      addBreadcrumb({
        category: 'auth',
        message: `Sign-in failed: ${error.message}`,
        level: 'warning',
      });
      toast.error(error.message);
      throw error;
    }

    addBreadcrumb({
      category: 'auth',
      message: 'Sign-in succeeded',
      level: 'info',
    });
    toast.success('Signed in successfully!');
  } catch (error) {
    log.error('Error signing in', error);
    if (error instanceof Error) {
      captureException(error, { context: 'signInWithEmail' });
    }
    throw error;
  }
};

/**
 * Signs up a user and ensures a profile row exists in the `profiles` table,
 * with default role 'student'.
 */
export const signUpWithEmail = async (
  email: string, 
  password: string, 
  userData?: { first_name?: string; last_name?: string }
) => {
  addBreadcrumb({
    category: 'auth',
    message: 'Sign-up attempt',
    level: 'info',
    data: { method: 'email' },
  });

  try {
    const { data: signupData, error: signupError } = await supabase.auth.signUp(
      {
        email,
        password,
        options: {
          data: userData || {}
        }
      }
    );
    if (signupError) {
      addBreadcrumb({
        category: 'auth',
        message: `Sign-up failed: ${signupError.message}`,
        level: 'warning',
      });
      toast.error(signupError.message);
      throw signupError;
    }

    addBreadcrumb({
      category: 'auth',
      message: 'Sign-up succeeded, creating profile',
      level: 'info',
    });

    // Guarantee a profile row exists immediately after signup
    const user = signupData.user;
    if (user && user.email) {
      // See if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Insert profile for this user, always default to 'student'
        const role = 'student';
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{ 
            id: user.id, 
            email: user.email, 
            role,
            first_name: userData?.first_name || '',
            last_name: userData?.last_name || ''
          }]);
        if (insertError) {
          addBreadcrumb({
            category: 'auth',
            message: `Profile creation failed: ${insertError.message}`,
            level: 'error',
          });
          toast.error('Failed to create user profile.');
          throw insertError;
        }

        addBreadcrumb({
          category: 'auth',
          message: 'Profile created successfully',
          level: 'info',
          data: { role },
        });
      }
    }

    toast.success(
      'Signed up successfully! Please check your email for verification.'
    );
  } catch (error) {
    log.error('Error signing up', error);
    if (error instanceof Error) {
      captureException(error, { context: 'signUpWithEmail' });
    }
    throw error;
  }
};

/**
 * Signs in a user using OAuth provider (Google, etc.)
 */
export const signInWithProvider = async (provider: 'google') => {
  addBreadcrumb({
    category: 'auth',
    message: `OAuth sign-in attempt`,
    level: 'info',
    data: { provider },
  });

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      addBreadcrumb({
        category: 'auth',
        message: `OAuth sign-in failed: ${error.message}`,
        level: 'warning',
        data: { provider },
      });
      toast.error(error.message);
      throw error;
    }

    addBreadcrumb({
      category: 'auth',
      message: `OAuth redirect initiated`,
      level: 'info',
      data: { provider },
    });
  } catch (error) {
    log.error(`Error signing in with ${provider}`, error);
    if (error instanceof Error) {
      captureException(error, { context: 'signInWithProvider', provider });
    }
    throw error;
  }
};

/**
 * Signs out the current user.
 */
export const signOut = async () => {
  addBreadcrumb({
    category: 'auth',
    message: 'Sign-out attempt',
    level: 'info',
  });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        addBreadcrumb({
          category: 'auth',
          message: `Sign-out failed: ${error.message}`,
          level: 'warning',
        });
        log.error('Failed to sign out', error);
        toast.error('Failed to sign out');
        return false;
      }
      addBreadcrumb({
        category: 'auth',
        message: 'Sign-out succeeded',
        level: 'info',
      });
      toast.success('Signed out successfully');
      return true;
    } else {
      addBreadcrumb({
        category: 'auth',
        message: 'Sign-out: no active session, clearing local state',
        level: 'info',
      });
      log.info('No active session found, clearing local state');
      toast.success('Signed out successfully');
      return true;
    }
  } catch (error) {
    log.error('Error during sign out', error);
    if (error instanceof Error) {
      captureException(error, { context: 'signOut' });
    }
    toast.error('Failed to sign out');
    return false;
  }
};
