
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    // We'll call our main send-class-reminders function
    const response = await fetch(
      "https://lnhtlbatcufmsyoujuqh.supabase.co/functions/v1/send-class-reminders", 
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        }
      }
    );

    const result = await response.json();
    
    return new Response(
      JSON.stringify({
        success: true, 
        message: "Cron job completed successfully", 
        result
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in cron function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
});
