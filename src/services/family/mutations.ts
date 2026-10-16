import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  ConversionPreview,
  ConvertToFamilyInput,
  NewChildInput,
} from './types';

const log = logger.create('familyMutations');

/**
 * Call an edge function and surface its own error message. A non-2xx
 * response arrives as a FunctionsHttpError whose message is generic; the
 * function's message is in the response body (error.context).
 */
async function invokeFamilyFunction<T>(
  name: string,
  body: Record<string, unknown>,
  fallbackMessage: string
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = fallbackMessage;
    try {
      const errorBody = await (
        error as { context?: { json?: () => Promise<{ error?: string }> } }
      ).context?.json?.();
      if (errorBody?.error) message = errorBody.error;
    } catch {
      // Keep the fallback if the body can't be read
    }
    log.error(`${name} failed`, error);
    throw new Error(message);
  }
  if (data && data.success === false) {
    throw new Error(data.error || fallbackMessage);
  }
  return data as T;
}

type RpcResult = { success: boolean; error?: string } | null;

/** Turn a brand-new account (e.g. a Google sign-up) into a family account. */
export async function becomeFamilyAccount(): Promise<boolean> {
  const { data, error } = await supabase.rpc('become_family_account');
  if (error) {
    log.error('become_family_account failed', error);
    return false;
  }
  return !!(data as RpcResult)?.success;
}

/** A parent adds a child (no login; optional email for their own class emails). */
export function addChild(input: NewChildInput) {
  return invokeFamilyFunction<{
    success: true;
    student: { id: string; first_name: string; last_name: string };
  }>(
    'create-managed-student',
    {
      first_name: input.firstName,
      last_name: input.lastName,
      grade: input.grade ?? '',
      email: input.email ?? '',
    },
    'Could not add the student.'
  );
}

const UPDATE_CHILD_ERRORS: Record<string, string> = {
  not_your_child: 'You can only edit your own students.',
  student_manages_own_details:
    'This student manages their own details from their account.',
  first_name_required: "Enter the student's first name.",
  invalid_email: 'Enter a valid email address.',
};

export async function updateChild(
  studentId: string,
  input: NewChildInput
): Promise<void> {
  const { data, error } = await supabase.rpc('update_my_child', {
    p_student_id: studentId,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_grade: input.grade ?? '',
    p_notification_email: input.email ?? '',
  });
  const result = data as RpcResult;
  if (error || !result?.success) {
    log.error('update_my_child failed', error ?? result);
    throw new Error(
      (result?.error && UPDATE_CHILD_ERRORS[result.error]) ||
        'Could not save the changes.'
    );
  }
}

/** The parent decides whether a student sees the family's hours remaining. */
export async function setStudentHoursVisible(
  studentId: string,
  visible: boolean
): Promise<void> {
  const { data, error } = await supabase.rpc('set_student_hours_visibility', {
    p_student_id: studentId,
    p_visible: visible,
  });
  if (error || !(data as RpcResult)?.success) {
    log.error('set_student_hours_visibility failed', error ?? data);
    throw new Error('Could not save that setting.');
  }
}

/** A student invites a parent, who will take over their hours and payments. */
export function inviteParent(email: string) {
  return invokeFamilyFunction<{
    success: true;
    email_sent: boolean;
    expires_at: string;
  }>('invite-guardian', { email }, 'Could not send the invite.');
}

export async function cancelParentInvite(): Promise<void> {
  const { error } = await supabase.rpc('cancel_my_guardian_invite');
  if (error) {
    log.error('cancel_my_guardian_invite failed', error);
    throw new Error('Could not cancel the invite.');
  }
}

/** The signed-in parent accepts a student's invite. */
export function acceptParentInvite(token: string) {
  return invokeFamilyFunction<{
    success: true;
    student_first_name: string;
    merged: boolean;
    hours_moved: number;
  }>('accept-guardian-invite', { token }, 'Could not accept the invitation.');
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export async function adminUnlinkParent(studentId: string): Promise<void> {
  const { data, error } = await supabase.rpc('admin_unlink_guardian', {
    p_student_id: studentId,
  });
  const result = data as RpcResult;
  if (error || !result?.success) {
    log.error('admin_unlink_guardian failed', error ?? result);
    throw new Error(
      result?.error === 'managed_student'
        ? "A student added by a parent can't be unlinked."
        : 'Could not unlink the parent.'
    );
  }
}

export async function previewConvertToFamily(
  accountId: string
): Promise<ConversionPreview> {
  const result = await invokeFamilyFunction<{
    success: true;
    would_move: ConversionPreview;
  }>(
    'admin-convert-to-family',
    { account_id: accountId, dry_run: true },
    'Could not check this account.'
  );
  return result.would_move;
}

export function convertToFamily(input: ConvertToFamilyInput) {
  return invokeFamilyFunction<{ success: true; child_id: string }>(
    'admin-convert-to-family',
    {
      account_id: input.accountId,
      dry_run: false,
      parent_first_name: input.parentFirstName,
      parent_last_name: input.parentLastName,
      child_first_name: input.childFirstName,
      child_last_name: input.childLastName,
    },
    'Conversion failed. Nothing was changed.'
  );
}

// ─── Student sign-in (parent) ───────────────────────────────────────────────

type StudentLoginAction = 'setup' | 'reset_password' | 'disable' | 'enable';

/** Set up, reset, or turn off/on the sign-in of a student the parent added. */
export function manageStudentLogin(
  action: StudentLoginAction,
  studentId: string,
  options: { username?: string; password?: string } = {}
) {
  return invokeFamilyFunction<{ success: true }>(
    'manage-student-login',
    { action, student_id: studentId, ...options },
    'Could not update the sign-in.'
  );
}
