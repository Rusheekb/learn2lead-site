import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { captureEvent } from '@/lib/posthog';
import { addBreadcrumb, captureException } from '@/lib/sentry';
import { retryEdgeFunction } from '@/utils/retryWithBackoff';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

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

const formatHours = (n: number) => `${n} hour${n === 1 ? '' : 's'}`;

export const completeClass = async (data: CompleteClassData): Promise<boolean> => {
  try {
    addBreadcrumb({ category: 'class.completion', message: 'Starting class completion', data: { classId: data.classId, studentId: data.studentId, subject: data.subject } });

    // 1. Auth check
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error('You must be logged in to complete classes');
      return false;
    }

    const durationHours = parseFloat(data.timeHrs) || 1;

    // 2. Deduct credit via edge function (handles ledger + subscription updates)
    const { data: creditResult, error: creditError } = await retryEdgeFunction<any>(
      () => supabase.functions.invoke(
        'deduct-class-credit',
        {
          body: {
            student_id: data.studentId,
            class_id: data.classId,
            class_title: data.classNumber,
            duration_hours: durationHours
          },
          headers: {
            Authorization: `Bearer ${session.session.access_token}`
          }
        }
      ),
      {
        maxRetries: 3,
        onRetry: (n, err) => {
          addBreadcrumb({ category: 'class.completion', message: `Retry ${n}: credit deduction`, level: 'warning', data: { error: String(err) } });
        }
      }
    );

    if (creditError || !creditResult?.success) {
      const errorCode = creditResult?.code || 'UNKNOWN';

      addBreadcrumb({ category: 'class.completion', message: 'Credit deduction failed', level: 'error', data: { errorCode, studentId: data.studentId } });

      captureEvent('credit_deduction_failed', {
        error_code: errorCode,
        student_id: data.studentId,
        class_id: data.classId,
      });
      
      if (errorCode === 'NO_SUBSCRIPTION') {
        toast.error('Student has no active subscription', {
          description: 'Please purchase hours to continue taking classes',
          action: {
            label: 'Buy Hours',
            onClick: () => window.location.href = '/pricing'
          }
        });
        return false;
      }
      
      if (errorCode === 'INSUFFICIENT_CREDITS' || errorCode === 'NO_CREDITS') {
        toast.error('Student has insufficient hours remaining', {
          description: 'Please purchase more hours to continue',
          action: {
            label: 'Buy Hours',
            onClick: () => window.location.href = '/pricing'
          }
        });
        return false;
      }

      throw new Error(creditResult?.error || 'Failed to deduct class credit');
    }

    addBreadcrumb({ category: 'class.completion', message: 'Credit deducted successfully', data: { creditsRemaining: creditResult.credits_remaining, deducted: creditResult.credits_deducted } });

    const creditsRemaining = creditResult.credits_remaining;
    const creditsDeducted = creditResult.credits_deducted || durationHours;
    const isAdminOverride = creditResult.admin_override;

    // 3. Atomically create class log + delete scheduled class via RPC
    // The RPC handles: advisory lock, existence check, duplicate prevention,
    // name resolution via UUID joins, log insertion, and scheduled class deletion
    const { data: rpcResult, error: rpcError } = await supabase.rpc('complete_class_atomic', {
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
    });

    if (rpcError) {
      log.error('RPC complete_class_atomic failed', rpcError);
      // Restore credit since atomic RPC failed (log was never inserted)
      await restoreCredit(session.session.access_token, data, durationHours);
      return false;
    }

    const result = rpcResult as { success: boolean; error?: string; code?: string };

    if (!result.success) {
      log.error('complete_class_atomic returned failure', undefined, { code: result.code, error: result.error });

      if (result.code === 'ALREADY_COMPLETED' || result.code === 'DUPLICATE_SESSION') {
        toast.error('This class has already been completed');
      } else if (result.code === 'CLASS_NOT_FOUND') {
        toast.error('Class no longer exists or has already been completed');
      } else {
        toast.error(result.error || 'Failed to complete class');
      }

      // Restore credit since the RPC didn't insert a log
      await restoreCredit(session.session.access_token, data, durationHours);
      return false;
    }

    // 4. Success instrumentation
    addBreadcrumb({ category: 'class.completion', message: 'Class completed successfully', data: { classId: data.classId, creditsRemaining } });

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
        description: 'Completed with 0 hours using admin privileges'
      });
    } else if (creditsRemaining === 0) {
      toast.success('Class completed - No hours remaining', {
        description: 'Student needs to purchase more hours',
        action: {
          label: 'View Plans',
          onClick: () => window.location.href = '/pricing'
        }
      });
    } else if (creditsRemaining < 3) {
      toast.success(`Class completed - ${formatHours(creditsRemaining)} remaining`, {
        description: 'Student is running low on hours'
      });
    } else {
      toast.success(`Class completed - ${formatHours(creditsRemaining)} remaining`);
    }
    
    return true;

  } catch (error) {
    log.error('Error completing class', error);
    if (error instanceof Error) {
      captureException(error, { classId: data.classId, studentId: data.studentId });
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to complete class';
    toast.error(errorMessage);
    return false;
  }
};

/** Attempt to restore credits after a failed atomic completion */
async function restoreCredit(accessToken: string, data: CompleteClassData, durationHours: number) {
  try {
    const { data: restoreResult, error: restoreError } = await supabase.functions.invoke(
      'restore-class-credit',
      {
        body: {
          student_id: data.studentId,
          class_id: data.classId,
          credits_to_restore: durationHours,
          reason: `Credit restored - atomic class completion failed for ${data.classNumber}`
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (restoreError || !restoreResult?.success) {
      log.error('Failed to restore credit after completion failure', restoreError || restoreResult?.error);
      toast.error('Class completion failed and credit could not be restored automatically', {
        description: 'Please contact admin to restore the credit manually'
      });
    } else {
      log.info('Credit successfully restored after completion failure');
      toast.error('Failed to complete class - credit has been restored', {
        description: 'Please try again or contact support if the issue persists'
      });
    }
  } catch (restoreErr) {
    log.error('Exception restoring credit', restoreErr);
    toast.error('Class completion failed and credit restoration encountered an error', {
      description: 'Please contact admin to restore the credit manually'
    });
  }
}
