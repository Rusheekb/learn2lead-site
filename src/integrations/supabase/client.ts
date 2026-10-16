import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Production builds always use the live project below. Local development
// (`vite` dev mode) may point at another backend — e.g. a local Supabase
// stack for testing — via VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
const LIVE_SUPABASE_URL = 'https://lnhtlbatcufmsyoujuqh.supabase.co';
const LIVE_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaHRsYmF0Y3VmbXN5b3VqdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTgyMTIsImV4cCI6MjA1OTg5NDIxMn0.6bxo3bNzkDWvyFMQPudYw5_3mVrxge-CfkChX2aDy9E';

const useDevOverride =
  import.meta.env.DEV &&
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_URL = useDevOverride
  ? import.meta.env.VITE_SUPABASE_URL
  : LIVE_SUPABASE_URL;
const SUPABASE_ANON_KEY = useDevOverride
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : LIVE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase configuration. Please check your environment setup.'
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
