import React, { createContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { signInWithEmail, signUpWithEmail, signOut, signInWithProvider } from '@/utils/authActions';
import { fetchUserRole } from '@/hooks/useUserRole';
import { getDashboardPath } from '@/utils/authNavigation';
import { useAuthState } from '@/hooks/useAuthState';
import { createStudent } from '@/services/students/studentService';
import { createTutor } from '@/services/tutors/tutorService';
import { toast } from 'sonner';
import { AuthContextType } from '@/types/auth';
import { getSavedRoute, clearSavedRoute } from '@/hooks/useRoutePersistence';
import { setUser as setSentryUser, addBreadcrumb } from '@/lib/sentry';
import { identifyUser, resetUser } from '@/lib/posthog';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const {
    user,
    setUser,
    session,
    setSession,
    isLoading,
    setIsLoading,
    userRole,
    setUserRole,
  } = useAuthState();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (event === 'SIGNED_IN' && currentSession?.user) {
        const u = currentSession.user;
        
        // Set user context for Sentry
        setSentryUser({ id: u.id, email: u.email });
        addBreadcrumb({
          category: 'auth',
          message: 'User signed in',
          level: 'info',
        });

        // Identify user in PostHog (role added after profile fetch below)
        identifyUser(u.id, { email: u.email });
        
        setTimeout(async () => {
          try {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('role, id')
              .eq('id', u.id)
              .maybeSingle();

            if (!existingProfile) {
              const defaultRole = u.email?.endsWith('@learn2lead.com')
                ? 'tutor'
                : 'student';
                
              // Extract first and last name from user metadata
              const { user_metadata } = u;
              const firstName = user_metadata?.first_name || user_metadata?.name?.split(' ')[0] || '';
              const lastName = user_metadata?.last_name || 
                (user_metadata?.name ? user_metadata.name.split(' ').slice(1).join(' ') : '');
                
              await supabase
                .from('profiles')
                .insert({ 
                  id: u.id, 
                  email: u.email!, 
                  role: defaultRole,
                  first_name: firstName,
                  last_name: lastName
                });

              // Create corresponding student/tutor record
              if (defaultRole === 'student') {
                await createStudent({
                  name: firstName ? `${firstName} ${lastName}`.trim() : (u.email?.split('@')[0] || 'New Student'),
                  email: u.email!,
                  subjects: [],
                });
              } else if (defaultRole === 'tutor') {
                await createTutor({
                  name: firstName ? `${firstName} ${lastName}`.trim() : (u.email?.split('@')[0] || 'New Tutor'),
                  email: u.email!,
                  subjects: [],
                  rating: 0,
                  classes: 0,
                  hourlyRate: 25,
                });
              }

              setUserRole(defaultRole);
            } else {
              setUserRole(existingProfile.role);
            }

            // Try to restore saved route, otherwise go to default dashboard
            const savedRoute = getSavedRoute(u.id);
            const targetPath = savedRoute || getDashboardPath(existingProfile?.role || 'student');
            
            navigate(targetPath, {
              replace: true,
            });
          } catch (err) {
            console.error('Error processing post-login actions:', err);
            setUserRole(null);
            navigate('/login', { replace: true });
          }
        }, 0);
      }

      if (event === 'SIGNED_OUT') {
        // Clear Sentry user context
        setSentryUser(null);
        addBreadcrumb({
          category: 'auth',
          message: 'User signed out',
          level: 'info',
        });

        // Reset PostHog identity
        resetUser();
        
        clearSavedRoute(); // Clear saved route on sign out
        setUserRole(null);
        setUser(null);
        setSession(null);
        navigate('/login', { replace: true });
      }
    });

    (async () => {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        const role = await fetchUserRole(s.user.id);
        setUserRole(role);
      }
      setIsLoading(false);
    })();

    return () => subscription.unsubscribe();
  }, [navigate, setIsLoading, setSession, setUser, setUserRole]);

  const handleSignIn = async (email: string, password: string) => {
    await signInWithEmail(email, password);
  };

  const handleSignUp = async (
    email: string, 
    password: string, 
    userData?: { first_name?: string; last_name?: string }
  ) => {
    await signUpWithEmail(email, password, userData);
  };

  const handleSignInWithOAuth = async (provider: 'google') => {
    await signInWithProvider(provider);
  };

  const handleSignOut = async () => {
    try {
      console.log('Signing out user...');
      const success = await signOut();
      
      if (success) {
        // Clear local state even if the API call failed but returned success
        setUser(null);
        setSession(null);
        setUserRole(null);
        navigate('/login');
      } else {
        // Manual fallback if signOut fails but we want to force logout
        setUser(null);
        setSession(null);
        setUserRole(null);
        clearSavedRoute();
        localStorage.removeItem('supabase.auth.token');
        navigate('/login');
        toast.success('Signed out successfully');
      }
    } catch (error) {
      console.error('Error in handleSignOut:', error);
      // Force logout even if there's an error
      setUser(null);
      setSession(null);
      setUserRole(null);
      clearSavedRoute();
      navigate('/login');
    }
  };

  const value = {
    user,
    session,
    userRole,
    isLoading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signInWithOAuth: handleSignInWithOAuth,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
