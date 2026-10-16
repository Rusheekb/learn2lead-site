/**
 * Pure builders for family-account emails (weekly family digest, parent
 * invite). Kept free of Deno/Supabase imports so they can be unit-tested with
 * Jest alongside the other _shared helpers.
 */

const SITE_URL = 'https://learn2lead.page';

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface DigestClassRow {
  date: string; // already formatted for the reader
  time: string;
  subject: string;
  title: string;
}

export interface DigestChild {
  name: string;
  upcoming: DigestClassRow[];
  completed: { count: number; hours: number; subjects: string[] } | null;
}

/** Whether a child has anything worth a digest this week. */
export function childHasActivity(child: DigestChild): boolean {
  return child.upcoming.length > 0 || (child.completed?.count ?? 0) > 0;
}

function childSection(child: DigestChild): string {
  const name = escapeHtml(child.name);
  const completed = child.completed
    ? `<div style="background: #f0fdf4; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #22c55e; margin: 8px 0;">
          <p style="margin: 4px 0;"><strong>${child.completed.count}</strong> class${child.completed.count !== 1 ? 'es' : ''} completed last week · <strong>${child.completed.hours.toFixed(1)}</strong> hours</p>
          <p style="margin: 4px 0;">Subjects: ${escapeHtml(child.completed.subjects.join(', ') || '—')}</p>
        </div>`
    : '';

  const upcoming =
    child.upcoming.length > 0
      ? `<table style="width: 100%; border-collapse: collapse; margin: 8px 0;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 8px; text-align: left;">Date</th>
              <th style="padding: 8px; text-align: left;">Time</th>
              <th style="padding: 8px; text-align: left;">Subject</th>
              <th style="padding: 8px; text-align: left;">Class</th>
            </tr>
          </thead>
          <tbody>${child.upcoming
            .map(
              (r) => `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(r.date)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(r.time)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(r.subject)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(r.title)}</td>
          </tr>`
            )
            .join('')}</tbody>
        </table>`
      : `<p style="color: #666; margin: 8px 0;">No classes scheduled for the next 7 days.</p>`;

  return `
        <h3 style="color: #1a1a2e; margin-top: 24px;">${name}</h3>
        ${completed}
        ${upcoming}`;
}

/**
 * One digest per family: each child's last week and next 7 days, then the
 * family's hours balance (pass buildDigestCreditSection's output).
 */
export function buildFamilyDigestEmail(args: {
  parentName: string;
  weekOf: string; // "October 19, 2026"
  children: DigestChild[];
  creditHtml: string;
}): { subject: string; html: string } {
  const sections = args.children.filter(childHasActivity).map(childSection);
  return {
    subject: `Your Family's Weekly Learn2Lead Digest — ${args.weekOf}`,
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a2e;">📬 Your Family's Weekly Digest</h2>
          <p>Hello ${escapeHtml(args.parentName || 'there')},</p>
          <p>Here's your family's summary for the week of ${escapeHtml(args.weekOf)}:</p>
          ${sections.join('')}
          ${args.creditHtml}
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="text-align: center;">
            <a href="${SITE_URL}/family" style="background-color: #6366f1; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Family Dashboard</a>
          </p>
          <p style="margin-top: 24px; font-size: 12px; color: #888; text-align: center;">
            This is an automated weekly digest from Learn2Lead. Please do not reply to this email.
          </p>
        </div>`,
  };
}

/** A student invites a parent to manage their hours and follow progress. */
export function buildGuardianInviteEmail(args: {
  studentName: string;
  token: string;
  expiresOn: string; // formatted date
}): { subject: string; html: string } {
  const student = escapeHtml(args.studentName || 'A Learn2Lead student');
  const link = `${SITE_URL}/accept-invite?token=${encodeURIComponent(args.token)}`;
  return {
    subject: `${args.studentName || 'A Learn2Lead student'} invited you to Learn2Lead`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #1a1a2e;">You've been invited to Learn2Lead</h2>
        <p>Hello,</p>
        <p><strong>${student}</strong> invited you to join their Learn2Lead tutoring account as their parent.</p>
        <p>When you accept, you'll be able to follow their classes, tutor notes and homework, and you'll manage their tutoring hours and payments.</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${link}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Accept Invitation</a>
        </p>
        <p style="font-size: 13px; color: #555;">Sign in or create your account with this email address to accept. The invitation expires on ${escapeHtml(args.expiresOn)}.</p>
        <p style="font-size: 13px; color: #555;">Didn't expect this? You can ignore this email.</p>
        <p style="margin-top: 24px; font-size: 12px; color: #888;">This is an automated notification from Learn2Lead.</p>
      </div>`,
  };
}
