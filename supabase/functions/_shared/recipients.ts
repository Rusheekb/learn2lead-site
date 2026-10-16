/**
 * Who gets an email about a student, and whose balance pays for them.
 *
 * Family accounts (docs/family-accounts-plan.md): a linked parent pays for
 * and hears about their student. Children a parent adds have no login and a
 * placeholder auth address that must never be emailed. For every account
 * without a parent — all accounts that existed before family accounts — the
 * recipient is the student themself and the payer is the student themself,
 * exactly as before.
 *
 * Kept free of Deno/Supabase imports (the client is passed in) so it can be
 * unit-tested with Jest alongside the other _shared helpers.
 */

/** Auth address domain for children a parent adds; never emailed. */
export const MANAGED_EMAIL_DOMAIN = 'managed.learn2lead.page';

export function managedStudentEmail(id: string): string {
  return `student-${id}@${MANAGED_EMAIL_DOMAIN}`;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return (
    !!email && email.trim().toLowerCase().endsWith(`@${MANAGED_EMAIL_DOMAIN}`)
  );
}

/** A real address we may send to. */
export function isSendableEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !isPlaceholderEmail(e);
}

/**
 * 'student'     class reminders, tutor assigned, class logged / homework
 * 'parent_only' balance, low/zero hours, blocked logs, weekly digest,
 *               quarterly report
 */
export type RecipientCategory = 'student' | 'parent_only';

export interface NotificationRecipient {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  timezone: string | null;
  /** true = the student's parent; false = the student themself */
  is_guardian: boolean;
  notify_class_reminders: boolean;
  notify_low_credits: boolean;
}

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export async function getStudentRecipients(
  supabase: RpcClient,
  studentId: string,
  category: RecipientCategory
): Promise<NotificationRecipient[]> {
  const { data, error } = await supabase.rpc(
    'student_notification_recipients',
    { p_student_id: studentId, p_category: category }
  );
  if (error) {
    throw new Error(`Recipient lookup failed: ${error.message}`);
  }
  return ((data as NotificationRecipient[] | null) ?? []).filter((r) =>
    isSendableEmail(r.email)
  );
}

/** The account whose balance pays for this student (their parent, or themself). */
export async function getBillingAccountId(
  supabase: RpcClient,
  studentId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('billing_account_for', {
    p_student_id: studentId,
  });
  if (error) {
    throw new Error(`Billing account lookup failed: ${error.message}`);
  }
  return (data as string | null) || studentId;
}

export function fullName(
  p: { first_name?: string | null; last_name?: string | null } | null,
  fallback = ''
): string {
  return `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || fallback;
}

/**
 * Who an email speaks to and about. A student reads "Your class"; their
 * parent reads "Maya's class".
 */
export function audienceFor(
  recipient: Pick<NotificationRecipient, 'is_guardian' | 'first_name'> & {
    last_name?: string | null;
  },
  studentFirstName: string | null | undefined
): {
  greetingName: string;
  /** "your" or "Maya's" */
  possessive: string;
  /** "you" or "Maya" */
  subject: string;
} {
  const student = (studentFirstName || '').trim();
  if (recipient.is_guardian) {
    return {
      greetingName: (recipient.first_name || '').trim() || 'there',
      possessive: student ? `${student}'s` : "your child's",
      subject: student || 'your child',
    };
  }
  return {
    greetingName: fullName(recipient) || 'there',
    possessive: 'your',
    subject: 'you',
  };
}
