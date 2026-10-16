/**
 * Alerts for new messages (docs/family-accounts-plan.md, Phase D). Pure, so
 * Jest can test them alongside the other _shared helpers.
 */

const SITE_URL = 'https://learn2lead.page';

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** The role a person plays in a conversation (thread_role in SQL). */
export type ThreadRole = 'student' | 'tutor' | 'parent' | 'staff' | 'former';

/** Where each kind of person reads their messages. */
export function messagesPathFor(role: ThreadRole, threadId: string): string {
  const base =
    role === 'tutor'
      ? '/tutor-dashboard'
      : role === 'parent'
        ? '/family'
        : role === 'staff'
          ? '/admin-dashboard'
          : '/dashboard';
  return `${base}?tab=messages&thread=${encodeURIComponent(threadId)}`;
}

/**
 * "about Maya" for everyone but the student themself, and not when the
 * student is the one writing.
 */
export function aboutStudentFor(args: {
  recipientRole: ThreadRole;
  senderIsStudent: boolean;
  studentFirstName: string;
}): string | null {
  if (args.recipientRole === 'student' || args.senderIsStudent) return null;
  return args.studentFirstName || null;
}

export function previewOf(body: string, max = 300): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

export function buildNewMessageEmail(args: {
  recipientName: string;
  senderName: string;
  aboutStudent: string | null;
  body: string;
  path: string; // from messagesPathFor
}): { subject: string; html: string } {
  const sender = args.senderName || 'Someone';
  const about = args.aboutStudent ? ` about ${args.aboutStudent}` : '';
  return {
    subject: `New message from ${sender}${about}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #1a1a2e;">New message</h2>
        <p>Hello ${escapeHtml(args.recipientName || 'there')},</p>
        <p><strong>${escapeHtml(sender)}</strong> sent a message${escapeHtml(about)}:</p>
        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #6366f1; margin: 16px 0; white-space: pre-wrap;">${escapeHtml(previewOf(args.body))}</div>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${SITE_URL}${args.path}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Read and Reply</a>
        </p>
        <p style="font-size: 13px; color: #555;">Replies to this email aren't delivered. Please reply on Learn2Lead.</p>
        <p style="margin-top: 24px; font-size: 12px; color: #888;">You can turn message alerts off in your Learn2Lead settings.</p>
      </div>`,
  };
}
