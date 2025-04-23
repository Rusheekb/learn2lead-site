
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';

export async function fetchProfile(userId: string): Promise<Profile> {
  const result = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (result.error) {
    console.error('Error fetching profile:', result.error);
    throw result.error;
  }
  
  return result.data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  const result = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error updating profile:', result.error);
    throw result.error;
  }
  
  return result.data;
}
