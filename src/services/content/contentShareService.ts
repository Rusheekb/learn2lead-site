
import { supabase } from '@/integrations/supabase/client';
import { ContentShareItem } from '@/types/sharedTypes';
import {
  fetchContentShares as fetchShares,
  createContentShare as createShare,
  updateContentShare as updateShare,
  deleteContentShare as deleteShare,
  fetchUserContentShares as fetchUserShares
} from '../content-shares';

// Re-export with the same function names to maintain backward compatibility
export const fetchContentShares = fetchShares;
export const createContentShare = createShare;
export const updateContentShare = updateShare;
export const deleteContentShare = deleteShare;
export const fetchUserContentShares = fetchUserShares;
