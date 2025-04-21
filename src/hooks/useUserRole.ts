
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from './useProfile';

/**
 * Fetches the user's role as stored in the profiles table (only), no more domain logic.
 */
export const fetchUserRole = async (userId: string): Promise<AppRole | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return data?.role as AppRole || null;
  } catch (error) {
    console.error('Error in fetchUserRole:', error);
    return null;
  }
};

