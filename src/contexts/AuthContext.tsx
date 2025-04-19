
import React, { createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { signInWithEmail, signUpWithEmail, signOut } from '@/utils/authActions';
import { fetchUserRole } from '@/hooks/useUserRole';
import { getDashboardPath } from '@/utils/authNavigation';

interface AuthContextType {
  user: ReturnType<typeof useAuthState>['user'];
  session: ReturnType<typeof useAuthState>['session'];
  userRole: ReturnType<typeof useAuthState>['userRole'];
  isLoading: ReturnType<typeof useAuthState>['isLoading'];
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const {
    user, setUser,
    session, setSession,
    isLoading, setIsLoading,
    userRole, setUserRole
  } = useAuthState();

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setTimeout(async () => {
            const role = await fetchUserRole(currentSession.user.id);
            setUserRole(role);
            
            if (event === 'SIGNED_IN') {
              navigate(getDashboardPath(role), { replace: true });
            }
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchUserRole(currentSession.user.id).then(role => {
          setUserRole(role);
          if (role) {
            navigate(getDashboardPath(role), { replace: true });
          }
        });
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (email: string, password: string) => {
    await signInWithEmail(email, password);
  };

  const handleSignUp = async (email: string, password: string) => {
    await signUpWithEmail(email, password);
  };

  const handleSignOut = async () => {
    if (await signOut()) {
      setUser(null);
      setSession(null);
      setUserRole(null);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 0);
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
