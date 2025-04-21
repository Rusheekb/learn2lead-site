
import { useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { AppRole } from './useProfile';

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);

  return {
    user,
    setUser,
    session,
    setSession,
    isLoading,
    setIsLoading,
    userRole,
    setUserRole
  };
};
