import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { signInWithEmail, signUpWithEmail, signOut } from '@/utils/authActions';
import { fetchUserRole } from '@/hooks/useUserRole';
import { getDashboardPath } from '@/utils/authNavigation';
import { AppRole } from '@/hooks/useProfile';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_IN' && currentSession?.user) {
          const u = currentSession.user;
          // 1) Ensure a profile row exists
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', u.id)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking profile:', fetchError);
          }

          if (!existingProfile) {
            const role: AppRole = u.email?.endsWith('@learn2lead.com') ? 'tutor' : 'student';
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({ id: u.id, email: u.email!, role });
            if (insertError) {
              console.error('Error creating profile:', insertError);
            }
          }

          // 2) Fetch the user role and redirect
          const role = await fetchUserRole(u.id);
          setUserRole(role);
          const path = getDashboardPath(role);
          navigate(path, { replace: true });
        }

        if (event === 'SIGNED_OUT') {
          setUserRole(null);
          navigate('/login', { replace: true });
        }
      }
    );

    // Initialize on load
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        const role = await fetchUserRole(s.user.id);
        setUserRole(role);
      }
      setIsLoading(false);
    })();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (email: string, password: string) => {
    try {
      await signInWithEmail(email, password);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      await signUpWithEmail(email, password);
    } catch (error) {
      console.error('Signup error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setSession(null);
      setUserRole(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    session,
    userRole,
    isLoading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
