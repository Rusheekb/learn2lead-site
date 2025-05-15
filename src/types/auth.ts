
import { User, Session } from '@supabase/supabase-js';
import { AppRole } from './profile';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData?: { first_name?: string; last_name?: string }) => Promise<void>;
  signInWithOAuth: (provider: 'google') => Promise<void>;
  signOut: () => Promise<void>;
}
