
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log('Running automated backup...');
    
    // Call the db-operations function to create a backup
    const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
      'db-operations',
      { body: { action: 'create' } }
    );
    
    if (functionError) {
      throw new Error(`Error invoking db-operations: ${functionError.message}`);
    }
    
    console.log('Backup response:', functionResponse);
    
    if (functionResponse.success) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Backup created: ${functionResponse.name}`,
          data: functionResponse 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      throw new Error(`Backup failed: ${functionResponse.error}`);
    }
  } catch (error) {
    console.error('Automated backup failed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred during backup' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
