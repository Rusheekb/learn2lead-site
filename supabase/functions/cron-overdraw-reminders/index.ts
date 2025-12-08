import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (message: string, data?: unknown) => {
  console.log(`[cron-overdraw-reminders] ${message}`, data ? JSON.stringify(data) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Cron job triggered - invoking send-overdraw-reminders");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Invoke the send-overdraw-reminders function
    const { data, error } = await supabase.functions.invoke("send-overdraw-reminders", {
      body: { triggered_by: "cron" },
    });

    if (error) {
      log("Error invoking send-overdraw-reminders", error);
      throw error;
    }

    log("Successfully invoked send-overdraw-reminders", data);

    return new Response(
      JSON.stringify({ 
        message: "Cron job completed", 
        result: data 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log("Error in cron-overdraw-reminders", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
