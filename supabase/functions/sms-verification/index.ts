import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import {
  isSmsConfigured,
  normalizePhone,
  sendSms,
  smsConfigFromEnv,
} from '../_shared/sms.ts';

/**
 * Add, verify or remove a mobile number for text messages
 * (docs/family-accounts-plan.md, Phase C).
 *   start   { phone, consent: true } — texts a 6-digit code
 *   confirm { code }                 — verifies and records opt-in
 *   remove  {}                       — deletes the number (texts stop)
 * The consent wording shown to the person is stored with the opt-in.
 */

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(
    `[SMS-VERIFICATION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`
  );
};

export const SMS_CONSENT_TEXT =
  'I agree to receive text messages from Learn2Lead about my classes, messages and account. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.';

async function hashCode(code: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${salt}:${code}`)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const rl = checkRateLimit(getRateLimitKey(req, 'sms-verification'), {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs!, corsHeaders);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const token = (req.headers.get('Authorization') ?? '')
      .replace('Bearer ', '')
      .trim();
    const { data: userData } = token
      ? await admin.auth.getUser(token)
      : { data: { user: null } };
    const user = userData?.user;
    if (!user) return json({ success: false, error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');

    if (action === 'start') {
      const smsConfig = smsConfigFromEnv((k) => Deno.env.get(k));
      if (!isSmsConfigured(smsConfig)) {
        return json(
          { success: false, error: 'Text messages aren’t available yet.' },
          503
        );
      }
      if (body.consent !== true) {
        return json(
          { success: false, error: 'Please agree to receive text messages.' },
          400
        );
      }
      const phone = normalizePhone(String(body.phone ?? ''));
      if (!phone) {
        return json(
          { success: false, error: 'Enter a valid mobile number.' },
          400
        );
      }
      const code = String(
        100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000)
      );
      const { error: upsertError } = await admin.from('contact_methods').upsert(
        {
          profile_id: user.id,
          kind: 'sms',
          value: phone,
          verified_at: null,
          opted_in_at: null,
          opted_out_at: null,
          verification_code_hash: await hashCode(code, user.id),
          verification_expires_at: new Date(
            Date.now() + 10 * 60 * 1000
          ).toISOString(),
          verification_attempts: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,kind' }
      );
      if (upsertError) {
        logStep('ERROR saving number', { error: upsertError.message });
        return json(
          { success: false, error: 'Could not save the number.' },
          500
        );
      }
      const sent = await sendSms(
        smsConfig,
        phone,
        `Your Learn2Lead verification code is ${code}. It expires in 10 minutes.`
      );
      if (sent.status !== 'sent') {
        logStep('ERROR sending code', { result: sent });
        return json(
          {
            success: false,
            error: 'Could not send the code. Check the number and try again.',
          },
          502
        );
      }
      return json({ success: true, phone });
    }

    if (action === 'confirm') {
      const code = String(body.code ?? '').replace(/\D/g, '');
      const { data: row } = await admin
        .from('contact_methods')
        .select(
          'id, verification_code_hash, verification_expires_at, verification_attempts'
        )
        .eq('profile_id', user.id)
        .eq('kind', 'sms')
        .maybeSingle();
      if (!row?.verification_code_hash) {
        return json({ success: false, error: 'Send a code first.' }, 400);
      }
      if (row.verification_attempts >= 5) {
        return json(
          { success: false, error: 'Too many tries. Send a new code.' },
          429
        );
      }
      if (new Date(row.verification_expires_at).getTime() < Date.now()) {
        return json(
          { success: false, error: 'That code has expired. Send a new one.' },
          400
        );
      }
      if ((await hashCode(code, user.id)) !== row.verification_code_hash) {
        await admin
          .from('contact_methods')
          .update({ verification_attempts: row.verification_attempts + 1 })
          .eq('id', row.id);
        return json({ success: false, error: 'That code isn’t right.' }, 400);
      }
      const now = new Date().toISOString();
      await admin
        .from('contact_methods')
        .update({
          verified_at: now,
          opted_in_at: now,
          opted_out_at: null,
          consent_text: SMS_CONSENT_TEXT,
          verification_code_hash: null,
          verification_expires_at: null,
          verification_attempts: 0,
          updated_at: now,
        })
        .eq('id', row.id);
      logStep('Verified', { user: user.id });
      return json({ success: true });
    }

    if (action === 'remove') {
      await admin
        .from('contact_methods')
        .delete()
        .eq('profile_id', user.id)
        .eq('kind', 'sms');
      return json({ success: true });
    }

    return json({ success: false, error: 'Unknown action.' }, 400);
  } catch (error) {
    logStep('ERROR', { message: String(error) });
    return json({ success: false, error: 'Something went wrong.' }, 500);
  }
});
