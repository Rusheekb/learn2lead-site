/**
 * Text messages through Twilio's REST API. Configured by edge secrets:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either
 *   TWILIO_MESSAGING_SERVICE_SID (preferred; handles STOP/HELP and A2P
 *   registration) or TWILIO_FROM_NUMBER.
 * TWILIO_API_BASE overrides the API host (local testing only).
 * Without credentials nothing is sent and callers get 'skipped' — texts are
 * an extra channel, never the only one.
 *
 * Kept free of Deno imports (env and fetch are passed in) so it can be
 * unit-tested with Jest alongside the other _shared helpers.
 */

export interface SmsConfig {
  accountSid?: string;
  authToken?: string;
  messagingServiceSid?: string;
  fromNumber?: string;
  apiBase?: string;
}

export type SmsResult =
  | { status: 'sent'; sid: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

export function smsConfigFromEnv(
  get: (k: string) => string | undefined
): SmsConfig {
  return {
    accountSid: get('TWILIO_ACCOUNT_SID'),
    authToken: get('TWILIO_AUTH_TOKEN'),
    messagingServiceSid: get('TWILIO_MESSAGING_SERVICE_SID'),
    fromNumber: get('TWILIO_FROM_NUMBER'),
    apiBase: get('TWILIO_API_BASE'),
  };
}

export const isSmsConfigured = (c: SmsConfig) =>
  !!(c.accountSid && c.authToken && (c.messagingServiceSid || c.fromNumber));

/** US numbers typed any common way become +1XXXXXXXXXX; others need a +. */
export function normalizePhone(input: string): string | null {
  const trimmed = (input || '').trim();
  const digits = trimmed.replace(/[^0-9]/g, '');
  if (trimmed.startsWith('+')) {
    return /^[1-9][0-9]{7,14}$/.test(digits) ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

/** Keep a text to one or two segments; never cut mid-word. */
export function trimSms(body: string, max = 300): string {
  const clean = body.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length)}…`;
}

export async function sendSms(
  config: SmsConfig,
  to: string,
  body: string,
  fetchImpl?: typeof fetch
): Promise<SmsResult> {
  if (!isSmsConfigured(config)) {
    return { status: 'skipped', reason: 'not_configured' };
  }
  const doFetch = fetchImpl ?? fetch;
  const base = config.apiBase || 'https://api.twilio.com';
  const params = new URLSearchParams({ To: to, Body: trimSms(body) });
  if (config.messagingServiceSid) {
    params.set('MessagingServiceSid', config.messagingServiceSid);
  } else {
    params.set('From', config.fromNumber!);
  }
  try {
    const res = await doFetch(
      `${base}/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: 'failed', error: String(data?.message ?? res.status) };
    }
    return { status: 'sent', sid: String(data?.sid ?? '') };
  } catch (e) {
    return { status: 'failed', error: String(e) };
  }
}

/**
 * Twilio signs webhook requests: base64(HMAC-SHA1(authToken, url + each
 * POST param name+value in name order)). Returns true when it matches.
 */
export async function isValidTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): Promise<boolean> {
  if (!authToken || !signature) return false;
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join('');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data)
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
