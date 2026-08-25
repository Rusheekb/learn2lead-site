/**
 * Zelle-only students (and anyone else who has never gone through Stripe
 * checkout) have no student_subscriptions row at all. admin-adjust-credits
 * used to 404 on this instead of letting an admin manually track their
 * credits. This bootstraps a row the same way a real Stripe purchase does
 * on first checkout (see allocateCreditsFromCheckout in stripe-webhooks).
 */
export interface ResolvedSubscription {
  subscriptionId: string;
  created: boolean;
}

export async function resolveOrCreateSubscriptionId(
  supabaseAdmin: any,
  studentId: string
): Promise<ResolvedSubscription> {
  const { data: sub } = await supabaseAdmin
    .from('student_subscriptions')
    .select('id')
    .eq('student_id', studentId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (sub) {
    return { subscriptionId: sub.id, created: false };
  }

  const { data: newSub, error: insertError } = await supabaseAdmin
    .from('student_subscriptions')
    .insert({
      student_id: studentId,
      plan_id: null,
      stripe_subscription_id: `manual_${studentId}_${Date.now()}`,
      stripe_customer_id: `manual_${studentId}`,
      status: 'active',
      credits_remaining: 0,
      credits_allocated: 0,
    })
    .select('id')
    .single();

  if (insertError || !newSub) {
    throw new Error('Failed to bootstrap subscription record');
  }

  return { subscriptionId: newSub.id, created: true };
}
