
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
    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Use setTimeout to avoid potential deadlocks with Supabase auth
          setTimeout(async () => {
            const role = await fetchUserRole(currentSession.user.id);
            setUserRole(role);
            
            if (event === 'SIGNED_IN') {
              const dashboardPath = getDashboardPath(role);
              navigate(dashboardPath, { replace: true });
            }
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        const role = await fetchUserRole(currentSession.user.id);
        setUserRole(role);
        // Navigate to dashboard if session exists and we're not already on dashboard
        if (role && window.location.pathname === '/') {
          navigate(getDashboardPath(role), { replace: true });
        }
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (email: string, password: string) => {
    await signInWithEmail(email, password);
    // Navigation will be handled by the auth state change listener
  };

  const handleSignUp = async (email: string, password: string) => {
    await signUpWithEmail(email, password);
    // For sign up, navigation is handled after email verification
  };

  const handleSignOut = async () => {
    if (await signOut()) {
      setUser(null);
      setSession(null);
      setUserRole(null);
      navigate('/login', { replace: true });
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
