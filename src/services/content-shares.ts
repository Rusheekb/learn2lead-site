
import { supabase, handleResult } from './supabaseClient';
import { ContentShareItem } from '@/types/sharedTypes';

export async function fetchContentShares(): Promise<ContentShareItem[]> {
  const result = await supabase.from('content_shares').select('*');

  // Handle array response correctly
  if (result.error) {
    console.error(result.error);
    throw result.error;
  }
  
  // Filter out content shares where files don't exist in storage
  const shares = result.data || [];
  const validShares: ContentShareItem[] = [];
  
  for (const share of shares) {
    if (!share.file_path) {
      validShares.push(share);
      continue;
    }
    
    try {
      const { data: fileData, error: fileError } = await supabase.storage
        .from('shared_content')
        .list(share.file_path.split('/').slice(0, -1).join('/'), {
          search: share.file_path.split('/').pop()
        });
      
      if (!fileError && fileData && fileData.length > 0) {
        validShares.push(share);
      }
    } catch (fileCheckError) {
      console.warn(`File ${share.file_path} not found in storage, skipping share`);
    }
  }
  
  return validShares;
}

export async function createContentShare(
  share: Omit<ContentShareItem, 'id'>
): Promise<ContentShareItem> {
  const result = await supabase
    .from('content_shares')
    .insert(share)
    .select()
    .single();
  return handleResult(result);
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
  return handleResult(result);
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
  return handleResult(result);
}

// Fetch content shares for a specific user
export async function fetchUserContentShares(
  userId: string
): Promise<ContentShareItem[]> {
  const result = await supabase
    .from('content_shares')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  // Handle array response correctly
  if (result.error) {
    console.error(result.error);
    throw result.error;
  }
  
  // Filter out content shares where files don't exist in storage
  const shares = result.data || [];
  const validShares: ContentShareItem[] = [];
  
  for (const share of shares) {
    if (!share.file_path) {
      validShares.push(share);
      continue;
    }
    
    try {
      const { data: fileData, error: fileError } = await supabase.storage
        .from('shared_content')
        .list(share.file_path.split('/').slice(0, -1).join('/'), {
          search: share.file_path.split('/').pop()
        });
      
      if (!fileError && fileData && fileData.length > 0) {
        validShares.push(share);
      }
    } catch (fileCheckError) {
      console.warn(`File ${share.file_path} not found in storage, skipping share`);
    }
  }
  
  return validShares;
}
