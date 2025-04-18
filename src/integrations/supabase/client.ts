
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://lnhtlbatcufmsyoujuqh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaHRsYmF0Y3VmbXN5b3VqdXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTgyMTIsImV4cCI6MjA1OTg5NDIxMn0.6bxo3bNzkDWvyFMQPudYw5_3mVrxge-CfkChX2aDy9E";

// Create a single instance of the Supabase client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Remove console logs that are slowing down performance
