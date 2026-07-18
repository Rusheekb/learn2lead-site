import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from 'npm:resend@2.0.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-DIGEST] ${step}${detailsStr}`);
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface ZeroCreditRow {
  student_name: string;
  email: string;
  credits_remaining: number;
  next_class_date: string;
  next_class_title: string;
}

interface AtRiskRow {
  student_name: string;
  email: string;
  credits_remaining: number;
  last_class_date: string | null;
  days_since_class: number;
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  const rlKey = getRateLimitKey(req, 'admin-weekly-digest');
  const rl = checkRateLimit(rlKey, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs!, corsHeaders);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    logStep('Starting admin weekly digest');

    // Fetch operational data via existing RPCs
    const [zeroCreditRes, atRiskRes, tutorSummaryRes, adminRes] =
      await Promise.all([
        supabase.rpc('get_zero_credit_upcoming_students'),
        supabase.rpc('get_at_risk_students'),
        supabase.rpc('get_tutor_unpaid_summary'),
        supabase
          .from('profiles')
          .select('email, first_name')
          .eq('role', 'admin'),
      ]);

    if (adminRes.error)
      throw new Error(`Failed to fetch admins: ${adminRes.error.message}`);

    const admins = adminRes.data ?? [];
    if (admins.length === 0) {
      logStep('No admin accounts found, skipping digest');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const zeroCredit = (zeroCreditRes.data ?? []) as ZeroCreditRow[];
    const atRisk = (atRiskRes.data ?? []) as AtRiskRow[];
    const tutorUnpaid = (tutorSummaryRes.data ?? []) as {
      tutor_name: string;
      total_owed: number;
      unpaid_count: number;
    }[];

    const totalTutorOwed = tutorUnpaid.reduce(
      (s, t) => s + Number(t.total_owed),
      0
    );

    // Skip if nothing actionable
    if (
      zeroCredit.length === 0 &&
      atRisk.length === 0 &&
      tutorUnpaid.length === 0
    ) {
      logStep('Nothing to report, skipping digest');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build HTML sections
    const zeroCreditHtml =
      zeroCredit.length > 0
        ? `<h3 style="color:#ef4444;margin-top:24px;">🚨 No Credits — Upcoming Session (${zeroCredit.length})</h3>
         <table style="width:100%;border-collapse:collapse;margin:8px 0;">
           <thead><tr style="background:#fef2f2;">
             <th style="padding:8px;text-align:left;font-size:12px;">Student</th>
             <th style="padding:8px;text-align:left;font-size:12px;">Next Class</th>
           </tr></thead>
           <tbody>${zeroCredit
             .map(
               (r) => `
             <tr>
               <td style="padding:8px;border-bottom:1px solid #fee2e2;">${r.student_name}</td>
               <td style="padding:8px;border-bottom:1px solid #fee2e2;">${r.next_class_title} · ${r.next_class_date}</td>
             </tr>`
             )
             .join('')}
           </tbody>
         </table>`
        : '';

    const atRiskHtml =
      atRisk.length > 0
        ? `<h3 style="color:#f59e0b;margin-top:24px;">⚠️ At-Risk Students — 30+ Days Inactive (${atRisk.length})</h3>
         <table style="width:100%;border-collapse:collapse;margin:8px 0;">
           <thead><tr style="background:#fffbeb;">
             <th style="padding:8px;text-align:left;font-size:12px;">Student</th>
             <th style="padding:8px;text-align:left;font-size:12px;">Last Class</th>
             <th style="padding:8px;text-align:left;font-size:12px;">Credits Left</th>
           </tr></thead>
           <tbody>${atRisk
             .map(
               (r) => `
             <tr>
               <td style="padding:8px;border-bottom:1px solid #fef3c7;">${r.student_name}</td>
               <td style="padding:8px;border-bottom:1px solid #fef3c7;">${r.last_class_date ? `${r.last_class_date} (${r.days_since_class}d ago)` : 'Never'}</td>
               <td style="padding:8px;border-bottom:1px solid #fef3c7;">${r.credits_remaining} hr${r.credits_remaining !== 1 ? 's' : ''}</td>
             </tr>`
             )
             .join('')}
           </tbody>
         </table>`
        : '';

    const tutorHtml =
      tutorUnpaid.length > 0
        ? `<h3 style="color:#1a1a2e;margin-top:24px;">💸 Pending Tutor Payments</h3>
         <div style="background:#f8f9fa;padding:12px 16px;border-radius:6px;">
           ${tutorUnpaid.map((t) => `<p style="margin:4px 0;"><strong>${t.tutor_name}</strong> — $${Number(t.total_owed).toFixed(2)} (${t.unpaid_count} class${t.unpaid_count !== 1 ? 'es' : ''})</p>`).join('')}
           <p style="margin:8px 0 0;font-weight:bold;border-top:1px solid #dee2e6;padding-top:8px;">Total: $${totalTutorOwed.toFixed(2)}</p>
         </div>`
        : '';

    const weekStr = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;border:1px solid #eaeaea;border-radius:8px;">
        <h2 style="color:#1a1a2e;">📋 Admin Weekly Digest — ${weekStr}</h2>
        <p>Here's what needs your attention this week:</p>
        ${zeroCreditHtml}
        ${atRiskHtml}
        ${tutorHtml}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="text-align:center;">
          <a href="https://learn2lead.page/admin-dashboard?tab=overview"
             style="background-color:#6366f1;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
            Open Admin Dashboard
          </a>
        </p>
        <p style="margin-top:24px;font-size:12px;color:#888;text-align:center;">
          Automated weekly digest · Learn2Lead
        </p>
      </div>`;

    let sent = 0;
    for (const admin of admins) {
      try {
        await resend.emails.send({
          from: 'Learn2Lead <noreply@learn2lead.com>',
          to: admin.email,
          subject: `Admin Digest — ${zeroCredit.length} urgent · ${atRisk.length} at-risk · $${totalTutorOwed.toFixed(2)} owed`,
          html,
        });
        sent++;
      } catch (e) {
        logStep('Failed to send to admin', {
          email: admin.email,
          error: String(e),
        });
      }
    }

    logStep('Done', {
      sent,
      zeroCredit: zeroCredit.length,
      atRisk: atRisk.length,
    });

    return new Response(JSON.stringify({ success: true, emails_sent: sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logStep('ERROR', { message: String(error) });
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
