import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  StudentLoginStatus,
  FamilyChild,
  FamilyHoursEntry,
  MyFamilyStatus,
  PendingGuardianInvite,
} from './types';

const log = logger.create('familyFetch');

/** The signed-in parent's children. */
export async function fetchMyChildren(): Promise<FamilyChild[]> {
  const { data, error } = await supabase.rpc('get_my_children');
  if (error) {
    log.error('Error fetching children', error);
    throw error;
  }
  return (data ?? []).map((c) => ({
    studentId: c.student_id,
    firstName: c.first_name,
    lastName: c.last_name ?? '',
    grade: c.grade || null,
    email: c.notification_email || null,
    timezone: c.timezone || null,
    managed: c.managed,
    linkedAt: c.linked_at,
    hoursVisible: c.hours_visible ?? true,
    username: c.username ?? '',
  }));
}

/** Every entry on the parent's own balance, each child's classes included. */
export async function fetchFamilyHoursHistory(
  limit = 50
): Promise<FamilyHoursEntry[]> {
  const { data, error } = await supabase.rpc('get_family_hours_history', {
    p_limit: limit,
  });
  if (error) {
    log.error('Error fetching family hours history', error);
    throw error;
  }
  return (data ?? []).map((e) => ({
    id: e.id,
    createdAt: e.created_at,
    transactionType: e.transaction_type,
    amount: Number(e.amount),
    balanceAfter: Number(e.balance_after),
    reason: e.reason ?? '',
    studentFirstName: e.student_first_name || null,
  }));
}

/** Invites addressed to the signed-in user's email. */
export async function fetchMyPendingInvites(): Promise<
  PendingGuardianInvite[]
> {
  const { data, error } = await supabase.rpc('get_my_pending_guardian_invites');
  if (error) {
    log.error('Error fetching pending invites', error);
    throw error;
  }
  return (data ?? []).map((i) => ({
    token: i.token,
    studentFirstName: i.student_first_name,
    studentLastName: i.student_last_name ?? '',
    createdAt: i.created_at,
    expiresAt: i.expires_at,
  }));
}

type RawFamilyStatus = {
  guardian: {
    first_name: string;
    last_name: string | null;
    email: string;
  } | null;
  pending_invite: {
    email: string;
    created_at: string;
    expires_at: string;
  } | null;
} | null;

/** A student's parent link and any invite they've sent. */
export async function fetchMyFamilyStatus(): Promise<MyFamilyStatus> {
  const { data, error } = await supabase.rpc('get_my_family_status');
  if (error) {
    log.error('Error fetching family status', error);
    throw error;
  }
  const raw = data as RawFamilyStatus;
  return {
    guardian: raw?.guardian
      ? {
          firstName: raw.guardian.first_name,
          lastName: raw.guardian.last_name ?? '',
          email: raw.guardian.email,
        }
      : null,
    pendingInvite: raw?.pending_invite
      ? {
          email: raw.pending_invite.email,
          createdAt: raw.pending_invite.created_at,
          expiresAt: raw.pending_invite.expires_at,
        }
      : null,
  };
}

/** Who a student is linked to, for admins (null if no parent). */
export async function fetchStudentGuardian(
  studentId: string
): Promise<{ id: string; name: string; email: string } | null> {
  const { data: link, error } = await supabase
    .from('guardian_links')
    .select('guardian_id')
    .eq('student_id', studentId)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (error) {
    log.error('Error fetching guardian link', error);
    throw error;
  }
  if (!link) return null;
  const { data: guardian } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('id', link.guardian_id)
    .maybeSingle();
  if (!guardian) return null;
  return {
    id: guardian.id,
    name: `${guardian.first_name} ${guardian.last_name ?? ''}`.trim(),
    email: guardian.email,
  };
}

/** A parent's children, for admins. */
export async function fetchGuardianChildren(
  guardianId: string
): Promise<{ id: string; name: string; managed: boolean }[]> {
  const { data: links, error } = await supabase
    .from('guardian_links')
    .select('student_id')
    .eq('guardian_id', guardianId)
    .order('created_at');
  if (error) {
    log.error('Error fetching guardian children', error);
    throw error;
  }
  if (!links || links.length === 0) return [];
  const { data: kids } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, managed')
    .in(
      'id',
      links.map((l) => l.student_id)
    );
  return (kids ?? []).map((k) => ({
    id: k.id,
    name: `${k.first_name} ${k.last_name ?? ''}`.trim(),
    managed: k.managed,
  }));
}

/** A parent's view of one student's sign-in. */
export async function fetchStudentLoginStatus(
  studentId: string
): Promise<StudentLoginStatus> {
  const { data, error } = await supabase.rpc('get_student_login_status', {
    p_student_id: studentId,
  });
  if (error) {
    log.error('Error fetching login status', error);
    throw error;
  }
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    username: String(raw.username ?? ''),
    managed: !!raw.managed,
    hasPassword: !!raw.has_password,
    disabled: !!raw.disabled,
    mustChangePassword: !!raw.must_change_password,
    lastSignInAt: (raw.last_sign_in_at as string | null) ?? null,
  };
}
