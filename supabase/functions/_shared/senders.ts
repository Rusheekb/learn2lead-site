/**
 * The real email (Resend) and text (Twilio) senders for notify.deliver().
 * Deno-only; the logic it wires up lives in notify.ts and sms.ts.
 */
import { Resend } from 'npm:resend@2.0.0';
import { sendSms, smsConfigFromEnv } from './sms.ts';
import type { Senders } from './notify.ts';

const FROM = 'Learn2Lead <noreply@learn2lead.page>';

export function makeSenders(): Senders {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  const smsConfig = smsConfigFromEnv((k) => Deno.env.get(k));
  return {
    sendEmail: async (to, subject, html) => {
      const { error } = (await resend.emails.send({
        from: FROM,
        to,
        subject,
        html,
      })) as { error?: { message: string } | null };
      if (error) throw new Error(error.message);
    },
    sendSms: (to, body) => sendSms(smsConfig, to, body),
  };
}
