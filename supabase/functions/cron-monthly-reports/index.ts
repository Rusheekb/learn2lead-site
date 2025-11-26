import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    console.log("Cron job triggered: Generating monthly reports");

    // Calculate previous month (first day)
    const now = new Date();
    const reportMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    console.log(`Generating reports for: ${reportMonth.toISOString()}`);

    // Call the generate-monthly-report function
    const { data, error } = await supabase.functions.invoke('generate-monthly-report', {
      body: { report_month: reportMonth.toISOString().split('T')[0] }
    });

    if (error) {
      console.error("Error invoking generate-monthly-report:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Monthly reports generation completed:", data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Monthly reports cron completed",
        data 
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in cron-monthly-reports:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
