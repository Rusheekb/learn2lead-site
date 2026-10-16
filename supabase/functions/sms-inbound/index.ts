import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { isValidTwilioSignature, normalizePhone } from '../_shared/sms.ts';

/**
 * Twilio's incoming-message webhook (set it on the Messaging Service or the
 * number): STOP-type replies record an opt-out, START-type replies opt back
 * in for people who verified that number. Twilio itself blocks texts after
 * STOP; this keeps our records — and the app's settings — in step.
 * verify_jwt is off; requests are authenticated by Twilio's signature.
 */

const STOP = [
  'stop',
  'stopall',
  'unsubscribe',
  'cancel',
  'end',
  'quit',
  'optout',
  'revoke',
];
const START = ['start', 'yes', 'unstop'];
// Twilio answers these itself (the HELP reply is set in the Messaging
// Service's opt-out settings), so we stay quiet rather than reply twice.
const HELP = ['help', 'info'];

const twiml = (message?: string) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${message ? `<Message>${message}</Message>` : ''}</Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );

Deno.serve(async (req) => {
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405 });

  const form = await req.formData().catch(() => null);
  if (!form) return new Response('Bad request', { status: 400 });
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  // The URL Twilio called (public address), as configured on the number.
  const publicUrl =
    Deno.env.get('TWILIO_INBOUND_URL') ??
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/sms-inbound`;
  const valid = await isValidTwilioSignature(
    Deno.env.get('TWILIO_AUTH_TOKEN') ?? '',
    publicUrl,
    params,
    req.headers.get('X-Twilio-Signature') ?? ''
  );
  if (!valid) return new Response('Forbidden', { status: 403 });

  const from = normalizePhone(params.From ?? '');
  const word = (params.Body ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (!from) return twiml();

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  if (STOP.includes(word)) {
    await admin
      .from('contact_methods')
      .update({ opted_out_at: new Date().toISOString() })
      .eq('kind', 'sms')
      .eq('value', from);
    console.log('[SMS-INBOUND] opt-out recorded');
    return twiml(); // Twilio sends the standard confirmation itself
  }
  if (START.includes(word)) {
    await admin
      .from('contact_methods')
      .update({ opted_out_at: null, opted_in_at: new Date().toISOString() })
      .eq('kind', 'sms')
      .eq('value', from)
      .not('verified_at', 'is', null);
    console.log('[SMS-INBOUND] opt-in recorded');
    return twiml();
  }
  if (HELP.includes(word)) return twiml();
  return twiml(
    'Learn2Lead: replies here aren’t read. Open the app to message your tutor, or email learn2leadtutoring@gmail.com.'
  );
});
