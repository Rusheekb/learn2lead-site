/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { signInWithEmail, signUpWithEmail, signOut } from '@/utils/authActions';
import { fetchUserRole } from '@/hooks/useUserRole';
import { getDashboardPath } from '@/utils/authNavigation';
import { AppRole } from '@/hooks/useProfile';
import { useAuthState } from '@/hooks/useAuthState';
import { createStudent, createTutor } from '@/services/supabaseClient';

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
        setTimeout(async () => {
          try {
            const { data: existingProfile, error: fetchError } = await supabase
              .from('profiles')
              .select('role, id')
              .eq('id', u.id)
              .maybeSingle();

            if (!existingProfile) {
              const defaultRole = u.email?.endsWith('@learn2lead.com')
                ? 'tutor'
                : 'student';
              await supabase
                .from('profiles')
                .insert({ id: u.id, email: u.email!, role: defaultRole });

              // Create corresponding student/tutor record
              if (defaultRole === 'student') {
                await createStudent({
                  id: u.id,
                  name: u.email?.split('@')[0] || 'New Student',
                  email: u.email!,
                  subjects: [],
                });
              } else if (defaultRole === 'tutor') {
                await createTutor({
                  id: u.id,
                  name: u.email?.split('@')[0] || 'New Tutor',
                  email: u.email!,
                  subjects: [],
                });
              }

              setUserRole(defaultRole);
            } else {
              setUserRole(existingProfile.role);
            }

            navigate(getDashboardPath(existingProfile?.role || 'student'), {
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
  }, [navigate]);

  const handleSignIn = async (email: string, password: string) => {
    await signInWithEmail(email, password);
  };

  const handleSignUp = async (email: string, password: string) => {
    await signUpWithEmail(email, password);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    navigate('/login');
  };

  const value = {
    user,
    session,
    userRole,
    isLoading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
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
