import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import { deliver, getTargetForProfile } from '../_shared/notify.ts';
import { makeSenders } from '../_shared/senders.ts';
import { newMessageText } from '../_shared/smsTexts.ts';
import {
  aboutStudentFor,
  buildNewMessageEmail,
  messagesPathFor,
  previewOf,
  type ThreadRole,
} from '../_shared/messageEmails.ts';

/**
 * Post a message and alert the other people in the conversation
 * (docs/family-accounts-plan.md, Phase D).
 *
 * The message is written as the signed-in user through post_message(), so
 * the database decides who may post. Alerts then go out through the
 * notification dispatcher (category 'messages'), at most one per person per
 * burst (claim_message_alerts). A failed alert never fails the send.
 */

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(
    `[SEND-MESSAGE] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`
  );
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fullName = (p?: {
  first_name?: string | null;
  last_name?: string | null;
}) => [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const rl = checkRateLimit(getRateLimitKey(req, 'send-message'), {
    maxRequests: 30,
    windowMs: 60 * 1000,
  });
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs!, corsHeaders);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const admin = createClient(
    url,
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
    const threadId = String(body.thread_id ?? '');
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    if (!UUID.test(threadId)) {
      return json({ success: false, error: 'Conversation not found.' }, 404);
    }
    if (!text || text.length > 4000) {
      return json(
        { success: false, error: 'Messages must be 1 to 4,000 characters.' },
        400
      );
    }

    // Post as the user: the database checks they're in this conversation
    // and the tutor is still matched with the student.
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: messageId, error: postError } = await asUser.rpc(
      'post_message',
      { p_thread_id: threadId, p_body: text }
    );
    if (postError) {
      const m = postError.message ?? '';
      if (/not authorized/i.test(m)) {
        return json(
          {
            success: false,
            error: "You can't send messages in this conversation.",
          },
          403
        );
      }
      if (/too quickly/i.test(m)) {
        return json({ success: false, error: m }, 429);
      }
      if (/1 to 4000/.test(m)) {
        return json(
          { success: false, error: 'Messages must be 1 to 4,000 characters.' },
          400
        );
      }
      throw new Error(m);
    }
    logStep('Posted', { threadId, messageId, sender: user.id });

    // Alerts (best-effort).
    let alerted = 0;
    try {
      const { data: alerts, error: claimError } = await admin.rpc(
        'claim_message_alerts',
        { p_message_id: messageId }
      );
      if (claimError) throw new Error(claimError.message);
      const recipients = (alerts ?? []) as {
        profile_id: string;
        role: ThreadRole;
      }[];

      if (recipients.length > 0) {
        const { data: thread } = await admin
          .from('message_threads')
          .select('student_id')
          .eq('id', threadId)
          .single();
        const { data: people } = await admin
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', [user.id, thread?.student_id].filter(Boolean));
        const sender = people?.find((p) => p.id === user.id);
        const student = people?.find((p) => p.id === thread?.student_id);
        const senderName = fullName(sender) || 'Someone';
        const senders = makeSenders();

        for (const r of recipients) {
          const target = await getTargetForProfile(
            admin,
            r.profile_id,
            'messages'
          );
          if (!target) continue;
          const about = aboutStudentFor({
            recipientRole: r.role,
            senderIsStudent: user.id === thread?.student_id,
            studentFirstName: student?.first_name ?? '',
          });
          const result = await deliver(
            target,
            {
              email: buildNewMessageEmail({
                recipientName: target.first_name ?? '',
                senderName,
                aboutStudent: about,
                body: text,
                path: messagesPathFor(r.role, threadId),
              }),
              sms: newMessageText({
                senderName,
                aboutStudent: about,
                preview: previewOf(text, 200),
              }),
            },
            senders
          );
          if (result.email === 'sent' || result.sms === 'sent') alerted++;
          logStep('Alert', { ...result, role: r.role });
        }
      }
    } catch (alertError) {
      logStep('WARNING: alerts failed', {
        error:
          alertError instanceof Error ? alertError.message : String(alertError),
      });
    }

    return json({ success: true, id: messageId, alerted });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message });
    return json(
      { success: false, error: 'Your message could not be sent.' },
      500
    );
  }
});
