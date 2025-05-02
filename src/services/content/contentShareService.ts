
import { supabase } from '@/integrations/supabase/client';
import { ContentShareItem } from '@/types/sharedTypes';

export async function fetchContentShares(): Promise<ContentShareItem[]> {
  const result = await supabase.from('content_shares').select('*');

  if (result.error) {
    console.error('Error fetching content shares:', result.error);
    throw result.error;
  }

  return result.data || [];
}

export async function createContentShare(
  share: Omit<ContentShareItem, 'id'>
): Promise<ContentShareItem> {
  const result = await supabase
    .from('content_shares')
    .insert(share)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error creating content share:', result.error);
    throw result.error;
  }
  
  return result.data;
}

export async function updateContentShare(
  id: string,
  updates: Partial<ContentShareItem>
): Promise<ContentShareItem> {
  const result = await supabase
    .from('content_shares')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error updating content share:', result.error);
    throw result.error;
  }
  
  return result.data;
}

export async function deleteContentShare(
  id: string
): Promise<ContentShareItem> {
  const result = await supabase
    .from('content_shares')
    .delete()
    .eq('id', id)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error deleting content share:', result.error);
    throw result.error;
  }
  
  return result.data;
}

export async function fetchUserContentShares(
  userId: string
): Promise<ContentShareItem[]> {
  const result = await supabase
    .from('content_shares')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (result.error) {
    console.error('Error fetching user content shares:', result.error);
    throw result.error;
  }

  return result.data || [];
}
