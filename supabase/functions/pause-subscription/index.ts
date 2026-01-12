import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PAUSE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { action, resumeDate } = await req.json();
    logStep("Request received", { action, resumeDate });

    if (!action || !["pause", "resume"].includes(action)) {
      throw new Error("Invalid action. Must be 'pause' or 'resume'");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }
    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
    });

    // Find active or paused subscription
    const subscription = subscriptions.data.find(
      (sub) => sub.status === "active" || sub.status === "paused"
    );

    if (!subscription) {
      throw new Error("No active or paused subscription found");
    }
    logStep("Found subscription", { subscriptionId: subscription.id, status: subscription.status });

    let updatedSubscription: Stripe.Subscription;

    if (action === "pause") {
      if (subscription.status === "paused" || subscription.pause_collection) {
        throw new Error("Subscription is already paused");
      }

      // Calculate resume timestamp if provided
      let resumesAt: number | undefined;
      if (resumeDate) {
        const resumeTimestamp = new Date(resumeDate).getTime() / 1000;
        // Ensure resume date is in the future
        if (resumeTimestamp <= Date.now() / 1000) {
          throw new Error("Resume date must be in the future");
        }
        // Max 90 days pause
        const maxPauseDate = Date.now() / 1000 + 90 * 24 * 60 * 60;
        if (resumeTimestamp > maxPauseDate) {
          throw new Error("Resume date cannot be more than 90 days in the future");
        }
        resumesAt = Math.floor(resumeTimestamp);
      }

      // Pause the subscription using pause_collection
      updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        pause_collection: {
          behavior: "void", // Don't invoice during pause
          resumes_at: resumesAt,
        },
      });

      logStep("Subscription paused", { 
        subscriptionId: subscription.id, 
        resumesAt: resumesAt ? new Date(resumesAt * 1000).toISOString() : "manual"
      });

      // Update local database
      await supabaseClient
        .from("student_subscriptions")
        .update({
          status: "paused",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Subscription paused successfully",
          resumesAt: resumesAt ? new Date(resumesAt * 1000).toISOString() : null,
          status: "paused",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Resume subscription
      if (!subscription.pause_collection) {
        throw new Error("Subscription is not paused");
      }

      updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        pause_collection: null, // Remove pause to resume
      });

      logStep("Subscription resumed", { subscriptionId: subscription.id });

      // Update local database
      await supabaseClient
        .from("student_subscriptions")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Subscription resumed successfully",
          status: "active",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});