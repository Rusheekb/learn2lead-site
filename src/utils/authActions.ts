import { supabase } from '@/integrations/supabase/client';
import { friendlyAuthError } from './authErrors';
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
      const message = friendlyAuthError(error);
      toast.error(message);
      throw new Error(message);
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
 * Signs in with a username. The username-login function resolves it to the
 * account on the server (so no email is ever revealed) and returns a session
 * for this browser to adopt.
 */
export const signInWithUsername = async (
  username: string,
  password: string
) => {
  addBreadcrumb({
    category: 'auth',
    message: 'Sign-in attempt',
    level: 'info',
    data: { method: 'username' },
  });

  const { data, error } = await supabase.functions.invoke('username-login', {
    body: { username, password },
  });

  let message: string | null = null;
  if (error) {
    message = 'That username and password don’t match. Please try again.';
    try {
      const body = await (
        error as { context?: { json?: () => Promise<{ error?: string }> } }
      ).context?.json?.();
      if (body?.error) message = body.error;
    } catch {
      // keep the default message
    }
  } else if (!data?.access_token) {
    message = data?.error || 'Sign-in failed. Please try again.';
  }
  if (message) {
    addBreadcrumb({
      category: 'auth',
      message: 'Username sign-in failed',
      level: 'warning',
    });
    toast.error(message);
    throw new Error(message);
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (sessionError) {
    const msg = friendlyAuthError(sessionError);
    toast.error(msg);
    throw new Error(msg);
  }
  toast.success('Signed in successfully!');
};

/**
 * Signs up a user and ensures a profile row exists in the `profiles` table,
 * with default role 'student'.
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  userData?: {
    first_name?: string;
    last_name?: string;
    account_type?: 'parent';
    username?: string;
  }
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
          data: userData || {},
        },
      }
    );
    if (signupError) {
      addBreadcrumb({
        category: 'auth',
        message: `Sign-up failed: ${signupError.message}`,
        level: 'warning',
      });
      const message = friendlyAuthError(signupError);
      toast.error(message);
      throw new Error(message);
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
        const { error: insertError } = await supabase.from('profiles').insert([
          {
            id: user.id,
            email: user.email,
            role,
            username: '', // the database generates one
            first_name: userData?.first_name || '',
            last_name: userData?.last_name || '',
          },
        ]);
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
      signupData.session
        ? 'Welcome to Learn2Lead! Your account is ready.'
        : user?.email_confirmed_at
          ? 'Account created! You can now log in.'
          : 'Signed up successfully! Please check your email for verification.'
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
 * Google's own sign-in button (see GoogleAuthButton): exchange the Google ID
 * token for a Supabase session. No redirect, so Google never shows the
 * Supabase project address.
 */
export const signInWithGoogleIdToken = async (credential: {
  token: string;
  nonce: string;
}) => {
  addBreadcrumb({
    category: 'auth',
    message: 'Google ID-token sign-in attempt',
    level: 'info',
  });
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: credential.token,
    nonce: credential.nonce,
  });
  if (error) {
    log.error('Google ID-token sign-in failed', error);
    captureException(error, { context: 'signInWithGoogleIdToken' });
    const message = friendlyAuthError(error);
    toast.error(message);
    throw new Error(message);
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
    const {
      data: { session },
    } = await supabase.auth.getSession();

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
