
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables if available, otherwise fall back to hardcoded values
// These fallback values should be the same as those previously used
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://lnhtlbatcufmsyoujuqh.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaHRsYmF0Y3VmbXN5b3VqdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTgyMTIsImV4cCI6MjA1OTg5NDIxMn0.6bxo3bNzkDWvyFMQPudYw5_3mVrxge-CfkChX2aDy9E';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
