import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
    apiVersion: "2025-08-27.basil" 
  });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("ERROR: Missing signature");
      throw new Error("No Stripe signature found in request headers");
    }

    // Verify webhook signature - supports both live and test secrets
    const liveSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const testSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
    
    if (!liveSecret && !testSecret) {
      throw new Error("Neither STRIPE_WEBHOOK_SECRET nor STRIPE_WEBHOOK_SECRET_TEST is set");
    }

    let event;
    let verificationSucceeded = false;
    
    if (liveSecret) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, liveSecret);
        logStep("Webhook signature verified with live secret");
        verificationSucceeded = true;
      } catch (liveErr) {
        logStep("Live secret verification failed, trying test secret...");
      }
    }
    
    if (!verificationSucceeded && testSecret) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, testSecret);
        logStep("Webhook signature verified with test secret");
        verificationSucceeded = true;
      } catch (testErr) {
        logStep("ERROR: Test secret verification also failed");
      }
    }
    
    if (!verificationSucceeded || !event) {
      throw new Error("Webhook signature verification failed with all available secrets");
    }

    logStep("Event type", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        
        logStep("Checkout session completed", { 
          sessionId: session.id,
          customerId: session.customer,
          mode: session.mode,
          metadata 
        });

        // Process referral if present
        if (metadata.referral_code_id && metadata.referrer_id) {
          await processReferralReward(
            stripe,
            supabaseClient,
            metadata.referral_code_id,
            metadata.referrer_id,
            session.customer as string,
            session.customer_email || '',
            metadata.discount_amount ? parseFloat(metadata.discount_amount) : 25,
            session.id
          );
        }

        // For one-time payments, allocate credits now
        if (session.mode === "payment" && session.payment_status === "paid") {
          await allocateCreditsFromCheckout(stripe, supabaseClient, session);
        }

        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});

// Allocate credits from a one-time payment checkout session
async function allocateCreditsFromCheckout(
  stripe: Stripe,
  supabaseClient: any,
  session: Stripe.Checkout.Session
) {
  const sessionId = session.id;
  const customerId = session.customer as string;
  const customerEmail = session.customer_email || session.customer_details?.email || '';
  const metadata = session.metadata || {};
  const userId = metadata.user_id;

  logStep("Allocating credits from checkout", { sessionId, customerId, customerEmail });

  // Idempotency check - use session ID as invoice_id
  const { data: existingEntry } = await supabaseClient
    .from('class_credits_ledger')
    .select('id')
    .eq('invoice_id', sessionId);

  if (existingEntry && existingEntry.length > 0) {
    logStep("Credits already allocated for this session, skipping", { sessionId });
    return;
  }

  // Get the price ID from the checkout session line items
  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1 });
  const priceId = lineItems.data[0]?.price?.id;

  if (!priceId) {
    logStep("ERROR: No price ID found in checkout session", { sessionId });
    return;
  }

  // Get plan details by price id
  const { data: plan, error: planError } = await supabaseClient
    .from('subscription_plans')
    .select('*')
    .eq('stripe_price_id', priceId)
    .single();

  if (planError || !plan) {
    logStep("ERROR: No plan found for price", { priceId, error: planError?.message });
    return;
  }

  // Get user profile - try metadata user_id first, then email lookup
  let profileId = userId;
  if (!profileId && customerEmail) {
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id')
      .ilike('email', customerEmail)
      .single();
    profileId = profile?.id;
  }

  if (!profileId) {
    logStep("ERROR: Cannot find user for credit allocation", { customerEmail, userId });
    return;
  }

  // Check for existing subscription record
  const { data: existingSub } = await supabaseClient
    .from('student_subscriptions')
    .select('id, credits_remaining')
    .eq('student_id', profileId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (existingSub) {
    // Add credits to existing subscription
    const newCredits = existingSub.credits_remaining + plan.classes_per_month;

    const { error: ledgerError } = await supabaseClient
      .from('class_credits_ledger')
      .insert({
        student_id: profileId,
        subscription_id: existingSub.id,
        transaction_type: 'credit',
        amount: plan.classes_per_month,
        balance_after: newCredits,
        reason: `Credit pack purchase - ${plan.name}`,
        invoice_id: sessionId,
      });

    if (ledgerError) {
      logStep("ERROR creating ledger entry", { error: ledgerError });
      throw ledgerError;
    }

    logStep("Credits added to existing record", { newCredits, sessionId });

    await sendPurchaseConfirmationEmail(
      customerEmail || '',
      supabaseClient,
      plan.name,
      plan.classes_per_month,
      newCredits,
      (session.amount_total || 0) / 100
    );
  } else {
    // Create new subscription record
    const { data: newSub, error: insertError } = await supabaseClient
      .from('student_subscriptions')
      .insert({
        student_id: profileId,
        plan_id: plan.id,
        stripe_subscription_id: `purchase_${sessionId}`,
        stripe_customer_id: customerId || `checkout_${profileId}`,
        status: 'active',
        credits_remaining: 0, // Will be set by ledger trigger
        credits_allocated: plan.classes_per_month,
      })
      .select()
      .single();

    if (insertError) {
      logStep("ERROR creating subscription record", { error: insertError });
      throw insertError;
    }

    const { error: ledgerError } = await supabaseClient
      .from('class_credits_ledger')
      .insert({
        student_id: profileId,
        subscription_id: newSub.id,
        transaction_type: 'credit',
        amount: plan.classes_per_month,
        balance_after: plan.classes_per_month,
        reason: `Initial credit pack purchase - ${plan.name}`,
        invoice_id: sessionId,
      });

    if (ledgerError) {
      logStep("ERROR creating initial ledger entry", { error: ledgerError });
      throw ledgerError;
    }

    logStep("New subscription created with credits", { subscriptionId: newSub.id, sessionId });

    await sendPurchaseConfirmationEmail(
      customerEmail || '',
      supabaseClient,
      plan.name,
      plan.classes_per_month,
      plan.classes_per_month,
      (session.amount_total || 0) / 100
    );
  }
}

// Process referral reward - credits the referrer
async function processReferralReward(
  stripe: Stripe,
  supabaseClient: any,
  referralCodeId: string,
  referrerId: string,
  newCustomerStripeId: string,
  newCustomerEmail: string,
  discountAmount: number,
  sessionId: string
) {
  try {
    logStep("Processing referral reward", { referralCodeId, referrerId, discountAmount });

    const { data: referrerProfile, error: referrerError } = await supabaseClient
      .from('profiles')
      .select('id, email')
      .eq('id', referrerId)
      .single();

    if (referrerError || !referrerProfile) {
      logStep("ERROR: Referrer not found", { referrerId });
      return;
    }

    const referrerCustomers = await stripe.customers.list({ 
      email: referrerProfile.email, 
      limit: 1 
    });

    if (referrerCustomers.data.length === 0) {
      logStep("ERROR: Referrer has no Stripe customer record", { email: referrerProfile.email });
      return;
    }

    const referrerCustomerId = referrerCustomers.data[0].id;
    const creditAmount = Math.round(discountAmount * 100);
    
    await stripe.customers.createBalanceTransaction(referrerCustomerId, {
      amount: -creditAmount,
      currency: 'usd',
      description: `Referral reward - new customer signup`,
    });

    logStep("Referrer credited", { referrerCustomerId, creditAmount: discountAmount });

    const { data: newUserProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .ilike('email', newCustomerEmail)
      .single();

    const { error: usageError } = await supabaseClient
      .from('referral_usage')
      .insert({
        referral_code_id: referralCodeId,
        used_by_user_id: newUserProfile?.id || referrerId,
        used_by_email: newCustomerEmail,
        subscription_id: sessionId,
      });

    if (usageError) {
      logStep("WARNING: Failed to record referral usage", { error: usageError.message });
    }

    // Increment times_used
    const { data: codeData } = await supabaseClient
      .from('referral_codes')
      .select('times_used')
      .eq('id', referralCodeId)
      .single();
    
    if (codeData) {
      await supabaseClient
        .from('referral_codes')
        .update({ times_used: (codeData.times_used || 0) + 1 })
        .eq('id', referralCodeId);
    }

    // Send notification
    await supabaseClient.from("notifications").insert({
      user_id: referrerId,
      message: `Your referral code was used by ${newCustomerEmail}! You earned a $${discountAmount} credit.`,
      type: "referral_reward",
    });

    logStep("Referral reward processed successfully");
  } catch (error) {
    logStep("ERROR processing referral reward", { error: error instanceof Error ? error.message : String(error) });
  }
}

// Send purchase confirmation email
async function sendPurchaseConfirmationEmail(
  customerEmail: string,
  supabaseClient: any,
  planName: string,
  creditsAdded: number,
  totalCredits: number,
  amountPaid: number,
) {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      logStep("Skipping email - RESEND_API_KEY not configured");
      return;
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .ilike('email', customerEmail)
      .maybeSingle();

    const studentName = profile?.first_name 
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Valued Student';

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "Learn2Lead <noreply@learn2lead.com>",
      to: [customerEmail],
      subject: "Your Credit Pack Purchase Confirmation",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Credits Added!</h1>
          <p>Dear ${studentName},</p>
          <p>Thank you for purchasing the ${planName}!</p>
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold;">
              Purchase Summary
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dcfce7;">Pack</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dcfce7; text-align: right; font-weight: bold;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dcfce7;">Amount Paid</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dcfce7; text-align: right; font-weight: bold;">$${amountPaid.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #dcfce7;">Credits Added</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #dcfce7; text-align: right; font-weight: bold; color: #16a34a;">+${creditsAdded} classes</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">Available Balance</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #16a34a;">${totalCredits} classes</td>
              </tr>
            </table>
          </div>
          
          <p>Your credits never expire — use them at your own pace. Log in to your dashboard to schedule classes.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://learn2lead-site.lovable.app/dashboard" style="background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
          
          <p>Thank you for being part of Learn2Lead!</p>
          <p><strong>The Learn2Lead Team</strong></p>
        </div>
      `,
    });

    logStep("Purchase confirmation email sent", { customerEmail, planName });
  } catch (error) {
    logStep("WARNING: Failed to send purchase confirmation email", { error: error instanceof Error ? error.message : String(error) });
  }
}
