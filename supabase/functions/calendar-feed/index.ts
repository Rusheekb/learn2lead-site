import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import { buildIcsCalendar, IcsEvent } from '../_shared/ics.ts';

/**
 * Subscribable calendar feed: GET /functions/v1/calendar-feed?token=<uuid>
 *
 * Calendar apps (Google, Apple, Outlook) poll this URL with no login, so the
 * token is the only credential: a random per-user value from
 * calendar_feed_tokens, readable only by its owner and resettable from
 * Settings. verify_jwt is off for that reason. Returns that user's classes
 * (as tutor or student) from the last 30 days onward, as exact UTC times.
 * Private class notes are deliberately left out.
 */

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALENDAR-FEED] ${step}${detailsStr}`);
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const textHeaders = { 'Content-Type': 'text/plain; charset=utf-8' };

const displayName = (
  p: { first_name?: string | null; last_name?: string | null } | null
) => `${p?.first_name || ''} ${p?.last_name || ''}`.trim();

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', {
      status: 405,
      headers: textHeaders,
    });
  }

  const rl = checkRateLimit(getRateLimitKey(req, 'calendar-feed'), {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs!, textHeaders);

  const token = new URL(req.url).searchParams.get('token') ?? '';
  // Same response for malformed and unknown tokens, so valid ones can't be
  // distinguished by probing.
  const notFound = () =>
    new Response('Calendar not found', { status: 404, headers: textHeaders });
  if (!UUID_RE.test(token)) return notFound();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { data: owner } = await supabase
      .from('calendar_feed_tokens')
      .select('user_id')
      .eq('token', token)
      .maybeSingle();
    if (!owner) return notFound();

    const userId = owner.user_id as string;
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const { data: classes, error } = await supabase
      .from('scheduled_classes')
      .select(
        `id, title, subject, start_at, end_at, zoom_link, tutor_id, student_id,
         student:profiles!scheduled_classes_student_id_fkey(first_name, last_name),
         tutor:profiles!scheduled_classes_tutor_id_fkey(first_name, last_name)`
      )
      .or(`tutor_id.eq.${userId},student_id.eq.${userId}`)
      .eq('status', 'scheduled')
      .gte('start_at', since)
      .order('start_at');
    if (error) throw new Error(error.message);

    const events: IcsEvent[] = (classes ?? []).map((c: any) => {
      const isTutor = c.tutor_id === userId;
      const other = displayName(isTutor ? c.student : c.tutor);
      const subject = c.subject || c.title || 'Tutoring';
      return {
        id: c.id,
        title: other ? `${subject} with ${other}` : subject,
        startAt: c.start_at,
        endAt: c.end_at,
        description: c.zoom_link
          ? `Learn2Lead class\nJoin Zoom: ${c.zoom_link}`
          : 'Learn2Lead class',
        location: c.zoom_link ? 'Zoom' : undefined,
        url: c.zoom_link || undefined,
      };
    });

    logStep('Served feed', { events: events.length });

    return new Response(
      buildIcsCalendar(events, { name: 'Learn2Lead classes' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'inline; filename="learn2lead.ics"',
          'Cache-Control': 'private, max-age=900',
        },
      }
    );
  } catch (e) {
    logStep('ERROR', { message: String(e) });
    return new Response('Calendar temporarily unavailable', {
      status: 500,
      headers: textHeaders,
    });
  }
});
