import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { captureEvent } from '@/lib/posthog';
import { addBreadcrumb, captureException } from '@/lib/sentry';
import { retryEdgeFunction } from '@/utils/retryWithBackoff';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';
import { formatHours } from '@/lib/hours';

const log = logger.create('classCompletion');

export interface CompleteClassData {
  classId: string;
  classNumber: string;
  title?: string;
  tutorName: string;
  studentName: string;
  studentId: string;
  tutorId: string;
  date: string;
  day: string;
  timeCst: string;
  timeHrs: string;
  subject: string;
  content: string;
  hw: string;
  additionalInfo: string;
}

const ADMIN_CONTACT = 'learn2leadtutoring@gmail.com';

/**
 * Tutor-facing explanation for a class that couldn't be logged because the
 * student has no hours left. Tutors can't fix this themselves (only the
 * family can buy hours), so the message says exactly what's wrong, confirms
 * nothing was charged, and tells them who to raise it with — plus a one-tap
 * copy of the details to paste into that message. Kept on screen until
 * dismissed so it can be read (or screenshotted) rather than flashing past.
 */
function showOutOfHoursError(
  data: CompleteClassData,
  errorCode: string,
  durationHours: number,
  body: { credits_needed?: number; credits_remaining?: number } | null
) {
  const name = data.studentName || 'This student';
  const needed = body?.credits_needed ?? durationHours;
  const remaining = body?.credits_remaining;

  const reason =
    errorCode === 'NO_SUBSCRIPTION'
      ? `${name} hasn't purchased any hours yet.`
      : remaining !== undefined
        ? `This class needs ${formatHours(needed)}, but ${name} only has ${formatHours(remaining)} left.`
        : `${name} doesn't have enough hours left to cover this ${formatHours(needed)} class.`;

  const details = `Couldn't log ${data.subject} class with ${name} on ${data.date} — ${reason}`;

  toast.error(`Class not logged: ${name} is out of hours`, {
    description: `${reason} Nothing was charged. Please let the admin know at ${ADMIN_CONTACT} so the family can add hours — you can log this class once they do.`,
    duration: Infinity,
    closeButton: true,
    action: {
      label: 'Copy details',
      onClick: () => {
        navigator.clipboard?.writeText(details).catch(() => {});
      },
    },
  });
}

export const completeClass = async (
  data: CompleteClassData
): Promise<boolean> => {
  try {
    addBreadcrumb({
      category: 'class.completion',
      message: 'Starting class completion',
      data: {
        classId: data.classId,
        studentId: data.studentId,
        subject: data.subject,
      },
    });

    // 1. Auth check
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error('You must be logged in to complete classes');
      return false;
    }

    const durationHours = parseFloat(data.timeHrs) || 1;

    // 2. Deduct credit via edge function (handles ledger + subscription updates)
    const { data: creditResult, error: creditError } =
      await retryEdgeFunction<any>(
        () =>
          supabase.functions.invoke('deduct-class-credit', {
            body: {
              student_id: data.studentId,
              class_id: data.classId,
              class_title: data.classNumber,
              duration_hours: durationHours,
              subject: data.subject,
              content: data.content,
              hw: data.hw,
            },
            headers: {
              Authorization: `Bearer ${session.session.access_token}`,
            },
          }),
        {
          maxRetries: 3,
          onRetry: (n, err) => {
            addBreadcrumb({
              category: 'class.completion',
              message: `Retry ${n}: credit deduction`,
              level: 'warning',
              data: { error: String(err) },
            });
          },
        }
      );

    // supabase-js returns data: null for any non-2xx response and puts the
    // body on error.context instead — and deduct-class-credit answers "student
    // is out of hours" with a 402. Without reading the body from there, the
    // out-of-hours branch below could never match and tutors only ever saw a
    // generic "Failed to deduct class credit".
    let creditBody = creditResult;
    if (!creditBody && typeof creditError?.context?.json === 'function') {
      creditBody = await creditError.context.json().catch(() => null);
    }

    if (creditError || !creditBody?.success) {
      const errorCode = creditBody?.code || 'UNKNOWN';

      addBreadcrumb({
        category: 'class.completion',
        message: 'Credit deduction failed',
        level: 'error',
        data: { errorCode, studentId: data.studentId },
      });

      captureEvent('credit_deduction_failed', {
        error_code: errorCode,
        student_id: data.studentId,
        class_id: data.classId,
      });

      if (
        errorCode === 'NO_CREDITS' ||
        errorCode === 'INSUFFICIENT_CREDITS' ||
        errorCode === 'NO_SUBSCRIPTION'
      ) {
        showOutOfHoursError(data, errorCode, durationHours, creditBody);
        return false;
      }

      throw new Error(creditBody?.error || 'Failed to deduct class credit');
    }

    addBreadcrumb({
      category: 'class.completion',
      message: 'Credit deducted successfully',
      data: {
        creditsRemaining: creditResult.credits_remaining,
        deducted: creditResult.credits_deducted,
      },
    });

    const creditsRemaining = creditResult.credits_remaining;
    const creditsDeducted = creditResult.credits_deducted || durationHours;
    const isAdminOverride = creditResult.admin_override;

    // 3. Atomically create class log + delete scheduled class via RPC
    // The RPC handles: advisory lock, existence check, duplicate prevention,
    // name resolution via UUID joins, log insertion, and scheduled class deletion
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'complete_class_atomic',
      {
        p_class_id: data.classId,
        p_class_number: data.classNumber,
        p_tutor_name: data.tutorName,
        p_student_name: data.studentName,
        p_date: data.date,
        p_day: data.day,
        p_time_cst: data.timeCst,
        p_time_hrs: data.timeHrs,
        p_subject: data.subject,
        p_content: data.content,
        p_hw: data.hw,
        p_additional_info: data.additionalInfo,
        // Same rounded duration deduct-class-credit just charged (see
        // creditsDeducted above) — reused here so Class Cost/Tutor Cost
        // scale by the exact same number, instead of re-deriving duration
        // a second time and risking drift for odd durations.
        p_credits_charged: creditsDeducted,
      }
    );

    if (rpcError) {
      log.error('RPC complete_class_atomic failed', rpcError);
      // Restore credit since atomic RPC failed (log was never inserted)
      await restoreCredit(session.session.access_token, data, durationHours);
      return false;
    }

    const result = rpcResult as {
      success: boolean;
      error?: string;
      code?: string;
    };

    if (!result.success) {
      log.error('complete_class_atomic returned failure', undefined, {
        code: result.code,
        error: result.error,
      });

      if (
        result.code === 'ALREADY_COMPLETED' ||
        result.code === 'DUPLICATE_SESSION'
      ) {
        // Class log already exists — credits were correctly deducted. Do NOT restore.
        toast.error('This class has already been completed');
        return false;
      } else if (result.code === 'CLASS_NOT_FOUND') {
        // Scheduled class gone and no log exists — class was externally deleted. Restore credits.
        toast.error('Class no longer exists or has already been completed');
        await restoreCredit(session.session.access_token, data, durationHours);
        return false;
      } else {
        // Genuine DB error — log was not inserted. Restore credits.
        toast.error(result.error || 'Failed to complete class');
        await restoreCredit(session.session.access_token, data, durationHours);
        return false;
      }
    }

    // 4. Success instrumentation
    addBreadcrumb({
      category: 'class.completion',
      message: 'Class completed successfully',
      data: { classId: data.classId, creditsRemaining },
    });

    captureEvent('class_completed', {
      subject: data.subject,
      tutor_name: data.tutorName,
      student_name: data.studentName,
      credits_remaining: creditsRemaining,
      credits_deducted: creditsDeducted,
      admin_override: isAdminOverride,
    });

    if (isAdminOverride) {
      toast.success('Class completed (Admin Override)', {
        description: 'Completed with 0 hours using admin privileges',
      });
    } else if (creditsRemaining === 0) {
      toast.success('Class completed - No hours remaining', {
        description: 'Student needs to purchase more hours',
        action: {
          label: 'View Plans',
          onClick: () => (window.location.href = '/pricing'),
        },
      });
    } else if (creditsRemaining < 3) {
      toast.success(
        `Class completed - ${formatHours(creditsRemaining)} remaining`,
        {
          description: 'Student is running low on hours',
        }
      );
    } else {
      toast.success(
        `Class completed - ${formatHours(creditsRemaining)} remaining`
      );
    }

    return true;
  } catch (error) {
    log.error('Error completing class', error);
    if (error instanceof Error) {
      captureException(error, {
        classId: data.classId,
        studentId: data.studentId,
      });
    }
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to complete class';
    toast.error(errorMessage);
    return false;
  }
};

/** Attempt to restore credits after a failed atomic completion */
async function restoreCredit(
  accessToken: string,
  data: CompleteClassData,
  durationHours: number
) {
  try {
    const { data: restoreResult, error: restoreError } =
      await supabase.functions.invoke('restore-class-credit', {
        body: {
          student_id: data.studentId,
          class_id: data.classId,
          reason: `Hours restored - class completion failed for ${data.classNumber}`,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

    if (restoreResult?.error === 'class_already_completed') {
      // The class actually did get logged server-side — the client just never
      // saw the success response (timeout/dropped connection). The debit was
      // correct and reverse_class_debit refused to touch it. Nothing is wrong.
      log.info('Class was already completed — no restore needed');
      toast.success('Class completed successfully');
      return;
    }

    if (restoreError || !restoreResult?.success) {
      log.error(
        'Failed to restore credit after completion failure',
        restoreError || restoreResult?.error
      );

      // Write an admin alert so the credit loss doesn't go unnoticed
      try {
        await supabase.from('notifications').insert({
          user_id: data.studentId,
          message: `ADMIN ALERT: Hours restore failed for class ${data.classNumber} (${data.classId}). Student ${data.studentName} may be missing ${formatHours(durationHours)}. Manual restoration required.`,
          type: 'admin_alert',
        });
      } catch (_) {
        // Don't let the notification failure mask the original error
      }

      toast.error(
        'Class completion failed and the hours could not be restored automatically',
        {
          description: 'Please contact admin to restore the hours manually',
        }
      );
    } else {
      log.info('Credit successfully restored after completion failure');
      toast.error('Failed to complete class - the hours have been restored', {
        description:
          'Please try again or contact support if the issue persists',
      });
    }
  } catch (restoreErr) {
    log.error('Exception restoring credit', restoreErr);
    toast.error(
      'Class completion failed and restoring the hours encountered an error',
      {
        description: 'Please contact admin to restore the hours manually',
      }
    );
  }
}
