import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    console.log("Cron job triggered: Generating quarterly reports");

    // Calculate previous quarter
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Determine current quarter and calculate previous quarter
    const currentQuarter = Math.floor(currentMonth / 3) + 1;
    let prevQuarter = currentQuarter - 1;
    let prevYear = currentYear;
    
    if (prevQuarter === 0) {
      prevQuarter = 4;
      prevYear -= 1;
    }
    
    // First day of previous quarter
    const prevQuarterStartMonth = (prevQuarter - 1) * 3;
    const reportQuarter = new Date(prevYear, prevQuarterStartMonth, 1);
    
    console.log(`Generating reports for Q${prevQuarter} ${prevYear} (starting ${reportQuarter.toISOString()})`);

    // Call the generate-quarterly-report function
    const { data, error } = await supabase.functions.invoke('generate-quarterly-report', {
      body: { report_quarter: reportQuarter.toISOString().split('T')[0] }
    });

    if (error) {
      console.error("Error invoking generate-quarterly-report:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Quarterly reports generation completed:", data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Quarterly reports cron completed",
        data 
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in cron-quarterly-reports:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
