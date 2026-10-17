/**
 * The one way notifications go out (docs/family-accounts-plan.md, Phase C).
 *
 *   1. Who: notification_targets(student, category) — the student and/or
 *      their parent per the family rules — or notification_target_for(person)
 *      for someone like a tutor.
 *   2. How: each person's own choices per category and channel (email on by
 *      default, matching the old settings; texts only with a verified,
 *      opted-in number).
 *   3. Send: email and/or text, never to a placeholder address.
 *
 * Senders are passed in, so this stays free of Deno/Supabase imports and can
 * be unit-tested with Jest.
 */
// Same rule as recipients.isSendableEmail (a test keeps them in step);
// inlined so this file has no imports and Jest can load it.
const MANAGED_DOMAIN = '@managed.learn2lead.page';
export function canEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim();
  return (
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) &&
    !e.toLowerCase().endsWith(MANAGED_DOMAIN)
  );
}

export type NotifyCategory =
  'class_reminders' | 'class_updates' | 'billing' | 'summaries' | 'messages';

export interface NotifyTarget {
  user_id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  timezone: string | null;
  /** true = the student's parent */
  is_guardian: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
}

export interface NotifyContent {
  email?: { subject: string; html: string };
  sms?: string;
}

export interface Senders {
  sendEmail: (to: string, subject: string, html: string) => Promise<void>;
  sendSms: (to: string, body: string) => Promise<{ status: string }>;
}

export interface DeliveryResult {
  user_id: string;
  email: 'sent' | 'skipped' | 'failed';
  sms: 'sent' | 'skipped' | 'failed';
}

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export async function getTargetsForStudent(
  supabase: RpcClient,
  studentId: string,
  category: NotifyCategory
): Promise<NotifyTarget[]> {
  const { data, error } = await supabase.rpc('notification_targets', {
    p_student_id: studentId,
    p_category: category,
  });
  if (error) throw new Error(`Target lookup failed: ${error.message}`);
  return (data as NotifyTarget[] | null) ?? [];
}

export async function getTargetForProfile(
  supabase: RpcClient,
  profileId: string,
  category: NotifyCategory
): Promise<NotifyTarget | null> {
  const { data, error } = await supabase.rpc('notification_target_for', {
    p_profile_id: profileId,
    p_category: category,
  });
  if (error) throw new Error(`Target lookup failed: ${error.message}`);
  const row = ((data as Omit<NotifyTarget, 'is_guardian'>[] | null) ?? [])[0];
  return row ? { ...row, is_guardian: false } : null;
}

/** Send one person their copy, by each channel they've chosen. Never throws. */
export async function deliver(
  target: NotifyTarget,
  content: NotifyContent,
  senders: Senders
): Promise<DeliveryResult> {
  const result: DeliveryResult = {
    user_id: target.user_id,
    email: 'skipped',
    sms: 'skipped',
  };

  if (content.email && target.email_enabled && canEmail(target.email)) {
    try {
      await senders.sendEmail(
        target.email!,
        content.email.subject,
        content.email.html
      );
      result.email = 'sent';
    } catch {
      result.email = 'failed';
    }
  }

  if (content.sms && target.sms_enabled && target.phone) {
    try {
      const sms = await senders.sendSms(target.phone, content.sms);
      result.sms =
        sms.status === 'sent'
          ? 'sent'
          : sms.status === 'failed'
            ? 'failed'
            : 'skipped';
    } catch {
      result.sms = 'failed';
    }
  }

  return result;
}
