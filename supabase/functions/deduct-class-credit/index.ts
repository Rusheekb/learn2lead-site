import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from 'npm:resend@2.0.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  getRateLimitKey,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/rateLimiter.ts';
import {
  shouldSendOutOfHoursEmail,
  buildOutOfHoursEmail,
  buildBlockedClassLogEmail,
  buildBlockedClassLogAdminEmail,
} from '../_shared/creditEmails.ts';
import { formatHours } from '../_shared/hours.ts';
import {
  audienceFor,
  fullName,
  getBillingAccountId,
  isSendableEmail,
} from '../_shared/recipients.ts';
import { getTargetsForStudent, NotifyTarget } from '../_shared/notify.ts';
import { makeSenders } from '../_shared/senders.ts';
import {
  classLoggedText,
  lowHoursText,
  outOfHoursText,
} from '../_shared/smsTexts.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DEDUCT-CREDIT] ${step}${detailsStr}`);
};

/** Round to nearest 0.5, minimum 0.5 */
const roundToHalfHour = (hours: number): number =>
  Math.max(0.5, Math.round(hours * 2) / 2);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const senders = makeSenders();

/**
 * Send class completion summary email. `intro` and `showBalance` default to
 * the student's own copy; a parent's copy names the child, and a student who
 * has a parent doesn't see the (family) balance.
 */
async function sendCompletionEmail(
  studentEmail: string,
  studentName: string,
  classTitle: string,
  subject: string,
  hoursUsed: number,
  creditsRemaining: number,
  tutorName: string,
  content?: string,
  hw?: string,
  opts: { intro?: string; showBalance?: boolean } = {}
) {
  const intro =
    opts.intro ?? "Your class has been marked as completed. Here's a summary:";
  const balanceSection =
    opts.showBalance === false
      ? ''
      : `<div style="background-color: #f0f9ff; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Hours remaining:</strong> ${formatHours(creditsRemaining)}</p>
          </div>`;
  const notesSection =
    content || hw
      ? `<div style="background-color: #f8f9fa; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #6366f1;">
        ${content ? `<p style="margin: 0 0 8px 0;"><strong>Covered in class:</strong><br/>${content}</p>` : ''}
        ${hw ? `<p style="margin: 0;"><strong>Homework:</strong><br/>${hw}</p>` : ''}
       </div>`
      : '';

  try {
    await resend.emails.send({
      from: 'Learn2Lead <noreply@learn2lead.page>',
      to: studentEmail,
      subject: `Class Completed: ${classTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a2e;">✅ Class Completed</h2>
          <p>Hello ${studentName},</p>
          <p>${intro}</p>
          <div style="background-color: #f8f9fa; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #22c55e;">
            <p style="margin: 4px 0;"><strong>Class:</strong> ${classTitle}</p>
            <p style="margin: 4px 0;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin: 4px 0;"><strong>Tutor:</strong> ${tutorName}</p>
            <p style="margin: 4px 0;"><strong>Duration:</strong> ${formatHours(hoursUsed)}</p>
          </div>
          ${notesSection}
          ${balanceSection}
          <p style="text-align: center; margin-top: 20px;">
            <a href="https://learn2lead.page/dashboard" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
          </p>
          <p style="margin-top: 24px; font-size: 12px; color: #888;">This is an automated notification from Learn2Lead.</p>
        </div>`,
    });
    logStep('Completion email sent', { to: studentEmail });
  } catch (e) {
    logStep('WARNING: Failed to send completion email', { error: String(e) });
  }
}

/** Send low credit warning email to student */
async function sendLowCreditWarning(
  studentEmail: string,
  studentName: string,
  creditsRemaining: number
) {
  try {
    await resend.emails.send({
      from: 'Learn2Lead <noreply@learn2lead.page>',
      to: studentEmail,
      subject: `⚠️ Running low on tutoring hours: ${formatHours(creditsRemaining)} left`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #ef4444;">⚠️ Running Low on Hours</h2>
          <p>Hello ${studentName},</p>
          <p>Your tutoring hours are running low.</p>
          <div style="background-color: #fef2f2; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0; font-size: 20px; font-weight: bold;">${formatHours(creditsRemaining)} remaining</p>
          </div>
          <p>To ensure uninterrupted tutoring, please purchase more hours:</p>
          <p style="text-align: center; margin-top: 16px;">
            <a href="https://learn2lead.page/pricing" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Purchase More Hours</a>
          </p>
          <p style="margin-top: 24px; font-size: 12px; color: #888;">This is an automated notification from Learn2Lead.</p>
        </div>`,
    });
    logStep('Low credit warning sent', {
      to: studentEmail,
      remaining: creditsRemaining,
    });
  } catch (e) {
    logStep('WARNING: Failed to send low credit email', { error: String(e) });
  }
}

const ADMIN_EMAIL = 'learn2leadtutoring@gmail.com';

/**
 * A tutor's log attempt was rejected because the student is out of hours.
 * Email the family (and admin) so it doesn't depend on the tutor relaying
 * it — once per class: tutors often retry, and the blocked_log_notifications
 * primary key makes the insert the dedupe. Always sent regardless of the
 * low-credit opt-out, since it concerns a session that already happened.
 * Never throws: a notification failure must not change the 402 the tutor
 * gets back.
 */
async function notifyBlockedClassLog(
  supabaseClient: any,
  args: {
    studentId: string;
    /** who gets the family copy (the payer); null = look up as before */
    payers: NotifyTarget[] | null;
    classId: string;
    tutorUserId: string;
    subject: string | undefined;
    hoursNeeded: number;
    hoursRemaining: number | null;
  }
) {
  try {
    const { data: claimed, error: claimError } = await supabaseClient
      .from('blocked_log_notifications')
      .upsert(
        { class_id: args.classId, student_id: args.studentId },
        { onConflict: 'class_id', ignoreDuplicates: true }
      )
      .select('class_id');

    if (claimError) {
      logStep('WARNING: blocked-log dedupe insert failed', {
        error: claimError.message,
      });
      return;
    }
    if (!claimed || claimed.length === 0) {
      logStep('Blocked-log email already sent for this class, skipping');
      return;
    }

    const [studentRes, classRes] = await Promise.all([
      supabaseClient
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', args.studentId)
        .single(),
      supabaseClient
        .from('scheduled_classes')
        .select('date, subject, tutor_id')
        .eq('id', args.classId)
        .maybeSingle(),
    ]);
    // Name the class's own tutor — an admin may be logging on their behalf.
    const tutorRes = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', classRes.data?.tutor_id ?? args.tutorUserId)
      .single();

    const student = studentRes.data;
    if (!student?.email) {
      logStep('WARNING: no student email for blocked-log notice');
      return;
    }

    const details = {
      studentName: fullName(student, 'there'),
      tutorName: fullName(tutorRes.data, tutorRes.data?.email || 'Your tutor'),
      subject: classRes.data?.subject || args.subject || 'tutoring',
      classDate: classRes.data?.date || '',
      hoursNeeded: args.hoursNeeded,
      hoursRemaining: args.hoursRemaining,
    };

    // The family copy goes to whoever pays: the student, or their parent.
    const payers = (
      args.payers ?? [
        {
          email: student.email,
          first_name: student.first_name,
          last_name: student.last_name,
          is_guardian: false,
        },
      ]
    ).filter((p) => isSendableEmail(p.email));
    const familySends = payers.map((payer) => {
      const familyEmail = buildBlockedClassLogEmail(
        payer.is_guardian
          ? {
              ...details,
              studentName: audienceFor(payer, student.first_name).greetingName,
              childName: student.first_name || 'your child',
            }
          : details
      );
      return resend.emails.send({
        from: 'Learn2Lead <noreply@learn2lead.page>',
        to: payer.email!,
        subject: familyEmail.subject,
        html: familyEmail.html,
      });
    });

    const adminEmail = buildBlockedClassLogAdminEmail({
      ...details,
      studentName: fullName(student, student.email),
      studentEmail: payers[0]?.email || student.email,
    });

    const results = await Promise.allSettled([
      ...familySends,
      resend.emails.send({
        from: 'Learn2Lead <noreply@learn2lead.page>',
        to: ADMIN_EMAIL,
        subject: adminEmail.subject,
        html: adminEmail.html,
      }),
    ]);
    logStep('Blocked-log notices sent', {
      family: results.slice(0, -1).map((r) => r.status),
      admin: results[results.length - 1].status,
    });
  } catch (e) {
    logStep('WARNING: blocked-log notification failed', { error: String(e) });
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Rate limit: 20 deductions per 10 minutes per user
  const rlKey = getRateLimitKey(req, 'deduct-credit');
  const rl = checkRateLimit(rlKey, {
    maxRequests: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (rl.limited) {
    logStep('Rate limited', { key: rlKey });
    return rateLimitResponse(rl.retryAfterMs!, corsHeaders);
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    logStep('Function started');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser(token);

    if (userError || !userData.user) {
      throw new Error('Authentication failed');
    }

    logStep('User authenticated', { userId: userData.user.id });

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (!profile || !['tutor', 'admin'].includes(profile.role)) {
      throw new Error('Only tutors and admins can complete classes');
    }

    const {
      student_id,
      class_id,
      class_title,
      duration_hours,
      subject: classSubject,
      content,
      hw,
    } = await req.json();

    if (!student_id || !class_id || !class_title) {
      throw new Error(
        'Missing required fields: student_id, class_id, class_title'
      );
    }

    const creditsToDeduct = roundToHalfHour(duration_hours || 1);

    logStep('Input validated', {
      student_id,
      class_id,
      class_title,
      duration_hours,
      creditsToDeduct,
    });

    // Whose balance pays: the student's parent if they have one, else the
    // student (every account without a parent, as before).
    const billingId = await getBillingAccountId(supabaseClient, student_id);
    if (billingId !== student_id) {
      logStep('Billing to parent account', { billing_id: billingId });
    }

    // Who hears about money (the payer), with their channels. Best-effort: a
    // failed lookup falls back to the student's own profile below.
    const payers = await getTargetsForStudent(
      supabaseClient,
      student_id,
      'billing'
    ).catch((e) => {
      logStep('WARNING: payer lookup failed', { error: String(e) });
      return null;
    });

    // Get active subscription (just the id/status — balance is read under lock below)
    const { data: subscription, error: subError } = await supabaseClient
      .from('student_subscriptions')
      .select('id, status')
      .eq('student_id', billingId)
      .in('status', ['active', 'trialing'])
      .single();

    if (subError || !subscription) {
      logStep('No active subscription found', { student_id });
      await notifyBlockedClassLog(supabaseClient, {
        studentId: student_id,
        payers,
        classId: class_id,
        tutorUserId: userData.user.id,
        subject: classSubject,
        hoursNeeded: creditsToDeduct,
        hoursRemaining: null,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active subscription found',
          code: 'NO_SUBSCRIPTION',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 402,
        }
      );
    }

    logStep('Subscription validated', { subscription_id: subscription.id });

    // Atomic: locks the subscription row, checks for an existing debit on this
    // class_id, checks sufficient balance, and inserts the ledger row — all inside
    // one transaction, so two concurrent completions can't both read a stale balance.
    const { data: rpcResult, error: rpcError } = await supabaseClient.rpc(
      'apply_credit_ledger_entry',
      {
        p_student_id: student_id,
        p_subscription_id: subscription.id,
        p_transaction_type: 'debit',
        p_amount: -creditsToDeduct,
        p_reason: `Class completed: ${class_title} (${creditsToDeduct}hr${creditsToDeduct === 1 ? '' : 's'})`,
        p_related_class_id: class_id,
      }
    );

    if (rpcError) {
      logStep('ERROR: apply_credit_ledger_entry RPC failed', {
        error: rpcError,
      });
      throw new Error('Failed to log credit transaction');
    }

    if (!rpcResult.success) {
      if (rpcResult.error === 'insufficient_credits') {
        logStep('Insufficient credits, blocking deduction', {
          credits: rpcResult.current_balance,
          required: creditsToDeduct,
        });
        await notifyBlockedClassLog(supabaseClient, {
          studentId: student_id,
          payers,
          classId: class_id,
          tutorUserId: userData.user.id,
          subject: classSubject,
          hoursNeeded: creditsToDeduct,
          hoursRemaining: Number(rpcResult.current_balance),
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: `Insufficient hours. Need ${creditsToDeduct} but only ${rpcResult.current_balance} remaining. Please purchase more hours.`,
            code: 'NO_CREDITS',
            credits_needed: creditsToDeduct,
            credits_remaining: Number(rpcResult.current_balance),
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 402,
          }
        );
      }

      logStep('ERROR: unexpected ledger failure', { result: rpcResult });
      throw new Error('Failed to log credit transaction');
    }

    if (rpcResult.idempotent) {
      logStep('Class already completed (idempotent response)', {
        transaction_id: rpcResult.ledger_id,
        balance_after: rpcResult.new_balance,
      });
      return new Response(
        JSON.stringify({
          success: true,
          credits_remaining: rpcResult.new_balance,
          transaction_id: rpcResult.ledger_id,
          idempotent: true,
          message: `Class already completed. ${formatHours(rpcResult.new_balance)} remaining.`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const newBalance = rpcResult.new_balance;
    const ledgerEntry = { id: rpcResult.ledger_id };
    logStep('Transaction logged', {
      transaction_id: ledgerEntry.id,
      credits_after: newBalance,
    });

    let message = '';
    if (newBalance === 0) {
      message = `${formatHours(creditsToDeduct)} deducted. No hours remaining. Purchase more to continue.`;
    } else {
      message = `${formatHours(creditsToDeduct)} deducted. ${formatHours(newBalance)} remaining.`;
    }

    // ── Fire-and-forget notification emails ──
    // Class-logged email: the student (at a real address) and their parent.
    // Money emails (out of hours, running low): whoever pays. Without a
    // parent both are just the student, exactly as before.
    const studentProfilePromise = supabaseClient
      .from('profiles')
      .select('email, first_name, last_name, notify_low_credits')
      .eq('id', student_id)
      .single();

    // Get tutor name for completion email
    const tutorProfilePromise = supabaseClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userData.user.id)
      .single();

    const classRecipientsPromise = getTargetsForStudent(
      supabaseClient,
      student_id,
      'class_updates'
    ).catch((e) => {
      logStep('WARNING: class email recipient lookup failed', {
        error: String(e),
      });
      return null;
    });

    const [studentProfileRes, tutorProfileRes, classRecipients] =
      await Promise.all([
        studentProfilePromise,
        tutorProfilePromise,
        classRecipientsPromise,
      ]);

    if (studentProfileRes.data) {
      const sp = studentProfileRes.data;
      const studentName =
        `${sp.first_name || ''} ${sp.last_name || ''}`.trim() || 'Student';
      const tutorName = tutorProfileRes.data
        ? `${tutorProfileRes.data.first_name || ''} ${tutorProfileRes.data.last_name || ''}`.trim() ||
          tutorProfileRes.data.email
        : 'Your tutor';

      // The student's own profile, used when a lookup failed — the
      // pre-family-accounts behaviour.
      const self: NotifyTarget = {
        user_id: student_id,
        email: sp.email,
        phone: null,
        first_name: sp.first_name,
        last_name: sp.last_name,
        timezone: null,
        is_guardian: false,
        email_enabled: true,
        sms_enabled: false,
      };
      const hasParent = billingId !== student_id;
      // Each person by their own channels; never a child's placeholder
      // address, even on the fallback path.
      const reachable = (r: NotifyTarget) =>
        (r.email_enabled && isSendableEmail(r.email)) ||
        (r.sms_enabled && !!r.phone);
      const toNotifyOfClass = (classRecipients ?? [self]).filter(reachable);
      const toNotifyOfMoney = (
        payers ?? [{ ...self, email_enabled: sp.notify_low_credits !== false }]
      ).filter(reachable);
      const emailOk = (r: NotifyTarget) =>
        r.email_enabled && isSendableEmail(r.email);

      // Send completion summary email (fire-and-forget) including any notes from the tutor
      for (const r of toNotifyOfClass) {
        const a = audienceFor(r, sp.first_name);
        if (r.sms_enabled && r.phone) {
          senders.sendSms(
            r.phone,
            classLoggedText({
              isGuardian: r.is_guardian,
              studentFirstName: sp.first_name || '',
              subject: classSubject || class_title,
              homework: hw,
            })
          );
        }
        if (!emailOk(r)) continue;
        sendCompletionEmail(
          r.email!,
          r.is_guardian ? a.greetingName : studentName,
          class_title,
          classSubject || class_title,
          creditsToDeduct,
          newBalance,
          tutorName,
          content,
          hw,
          r.is_guardian
            ? {
                intro: `${a.possessive.charAt(0).toUpperCase()}${a.possessive.slice(1)} class has been marked as completed. Here's a summary:`,
              }
            : { showBalance: !hasParent }
        );
      }

      // Hitting exactly 0 gets its own "out of hours" email, separate from the
      // low-credit warning below — that warning is throttled to once per 7
      // days, so a family warned at 2 hours earlier in the week previously
      // got nothing when they actually ran out.
      let sentOutOfHours = false;
      if (Number(newBalance) === 0) {
        // The payer's auto-renew; classes coming up for everyone they pay
        // for (just this student when there's no parent).
        const { data: children } = await supabaseClient
          .from('guardian_links')
          .select('student_id')
          .eq('guardian_id', billingId);
        const familyIds = [
          ...new Set([
            student_id,
            ...(children ?? []).map(
              (c: { student_id: string }) => c.student_id
            ),
          ]),
        ];

        const [{ data: autoRenew }, { count: upcomingCount }] =
          await Promise.all([
            supabaseClient
              .from('auto_renewal_settings')
              .select('enabled')
              .eq('student_id', billingId)
              .eq('enabled', true)
              .maybeSingle(),
            supabaseClient
              .from('scheduled_classes')
              .select('id', { count: 'exact', head: true })
              .in('student_id', familyIds)
              .eq('status', 'scheduled')
              .gte('date', new Date().toISOString().split('T')[0])
              .neq('id', class_id),
          ]);

        for (const r of toNotifyOfMoney) {
          if (
            Number(newBalance) === 0 &&
            !autoRenew &&
            r.sms_enabled &&
            r.phone
          ) {
            senders.sendSms(r.phone, outOfHoursText());
            sentOutOfHours = true;
          }
          if (
            !emailOk(r) ||
            !shouldSendOutOfHoursEmail({
              newBalance: Number(newBalance),
              autoRenewEnabled: !!autoRenew,
              notifyLowCredits: r.email_enabled,
            })
          ) {
            continue;
          }
          const email = buildOutOfHoursEmail({
            studentName: r.is_guardian
              ? audienceFor(r, sp.first_name).greetingName
              : studentName,
            upcomingClassCount: upcomingCount ?? 0,
            childName: r.is_guardian
              ? sp.first_name || 'your child'
              : undefined,
          });
          try {
            await resend.emails.send({
              from: 'Learn2Lead <noreply@learn2lead.page>',
              to: r.email!,
              subject: email.subject,
              html: email.html,
            });
            sentOutOfHours = true;
            logStep('Out-of-hours email sent', { to: r.email });
          } catch (e) {
            logStep('WARNING: Failed to send out-of-hours email', {
              error: String(e),
            });
          }
        }
      }

      // Send low credit warning if balance <= 2 hours and the payer has notifications enabled
      // (skipped when the out-of-hours email just went out, to avoid two emails at once)
      const lowCreditRecipients = toNotifyOfMoney;
      if (
        !sentOutOfHours &&
        newBalance <= 2 &&
        lowCreditRecipients.length > 0
      ) {
        // Check if we already sent a warning recently (within 7 days) to avoid spam
        // — throttled per paying account, so siblings share one warning.
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: recentWarning } = await supabaseClient
          .from('overdraw_reminders_sent')
          .select('id')
          .eq('student_id', billingId)
          .gte('sent_at', sevenDaysAgo.toISOString())
          .limit(1);

        if (!recentWarning || recentWarning.length === 0) {
          for (const r of lowCreditRecipients) {
            if (r.sms_enabled && r.phone) {
              senders.sendSms(r.phone, lowHoursText(Number(newBalance)));
            }
            if (!emailOk(r)) continue;
            sendLowCreditWarning(
              r.email!,
              r.is_guardian
                ? audienceFor(r, sp.first_name).greetingName
                : studentName,
              newBalance
            );
          }

          // Log the warning to prevent spam
          await supabaseClient.from('overdraw_reminders_sent').insert({
            student_id: billingId,
            threshold: 2,
            amount_owed: 0,
          });
        } else {
          logStep('Low credit warning already sent recently, skipping');
        }
      }
    }

    // Check auto-renewal threshold (fire-and-forget, never blocks class completion)
    try {
      const { data: renewalSettings } = await supabaseClient
        .from('auto_renewal_settings')
        .select('enabled, renewal_pack, threshold')
        .eq('student_id', billingId)
        .eq('enabled', true)
        .maybeSingle();

      if (renewalSettings && newBalance <= renewalSettings.threshold) {
        logStep('Auto-renewal threshold met, triggering renewal', {
          balance: newBalance,
          threshold: renewalSettings.threshold,
          pack: renewalSettings.renewal_pack,
        });

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        fetch(`${supabaseUrl}/functions/v1/process-auto-renewal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            student_id: billingId,
            renewal_pack: renewalSettings.renewal_pack,
          }),
        }).catch((err) => {
          logStep('WARNING: Failed to invoke auto-renewal', {
            error: String(err),
          });
        });
      }
    } catch (renewalErr) {
      logStep('WARNING: Auto-renewal check failed (non-blocking)', {
        error: String(renewalErr),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        credits_remaining: newBalance,
        credits_deducted: creditsToDeduct,
        transaction_id: ledgerEntry.id,
        message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        code: 'INTERNAL_ERROR',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
