
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const navigate = useNavigate();

  // Fetch user role from profiles table
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
        return null;
      }

      if (data?.role) {
        setUserRole(data.role as AppRole);
        return data.role as AppRole;
      }
      
      return null;
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setUserRole(null);
      return null;
    }
  };

  // Route user to the appropriate dashboard based on their role
  const routeUserByRole = (role: AppRole | null) => {
    if (!role) return;
    
    switch (role) {
      case 'student':
        navigate('/dashboard');
        break;
      case 'tutor':
        navigate('/tutor-dashboard');
        break;
      case 'admin':
        navigate('/admin-dashboard');
        break;
      default:
        navigate('/');
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Use setTimeout to avoid recursive calls with Supabase client
          setTimeout(async () => {
            const role = await fetchUserRole(currentSession.user.id);
            
            if (event === 'SIGNED_IN') {
              routeUserByRole(role);
            }
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchUserRole(currentSession.user.id).then(role => {
          if (role) {
            routeUserByRole(role);
          }
        });
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
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

  const signUp = async (email: string, password: string) => {
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

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        toast.error('Failed to sign out');
        return;
      }
      
      setUser(null);
      setSession(null);
      setUserRole(null);
      toast.success('Signed out successfully');
      
      // Navigate after state updates to avoid conflicts
      setTimeout(() => {
        navigate('/login');
      }, 0);
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const value = {
    user,
    session,
    userRole,
    isLoading,
    signIn,
    signUp,
    signOut
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
