
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export { supabase };

const log = logger.create('supabaseClient');

import type {
  PostgrestError,
  PostgrestResponse,
  PostgrestSingleResponse,
} from '@supabase/supabase-js';

// Unified result handler for DRY error handling - Overload for single results
function handleResult<T>(response: PostgrestSingleResponse<T>): T;
// Overload for multiple results
function handleResult<T>(response: PostgrestResponse<T>): T[];
// Implementation
function handleResult<T>(
  response: PostgrestResponse<T> | PostgrestSingleResponse<T>
): T | T[] {
  if (response.error) {
    log.error('Supabase query error', response.error);
    throw response.error;
  }
  if (!response.data) {
    throw new Error('No data returned');
  }
  return response.data;
}

export { handleResult };
