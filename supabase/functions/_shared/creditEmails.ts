/**
 * Pure helpers for credit-balance emails (weekly digest balance section,
 * out-of-hours email, blocked-class-log email). Kept free of Deno/Supabase
 * imports so they can be unit-tested with Jest alongside the other _shared
 * helpers.
 */

const PRICING_URL = 'https://learn2lead.page/pricing';

const hoursLabel = (n: number) => `${n} hour${n === 1 ? '' : 's'}`;

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const buyHoursButton = `
  <p style="text-align: center; margin-top: 20px;">
    <a href="${PRICING_URL}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Buy More Hours</a>
  </p>`;

const wrap = (inner: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
    ${inner}
    <p style="margin-top: 24px; font-size: 12px; color: #888;">This is an automated notification from Learn2Lead.</p>
  </div>`;

/**
 * Weekly digest "Credit Balance" section. Returns '' when the balance is
 * unknown (lookup failed) — the digest previously defaulted an unreadable
 * balance to 0, which told every family they were out of hours for weeks.
 * Never show a number we didn't actually read.
 */
export function buildDigestCreditSection(balance: number | null): string {
  if (balance === null || !Number.isFinite(balance)) return '';

  const color = balance <= 2 ? '#ef4444' : balance <= 4 ? '#f59e0b' : '#22c55e';

  return `
        <h3 style="color: #1a1a2e; margin-top: 24px;">💰 Hours Balance</h3>
        <div style="background: #f8f9fa; padding: 12px 16px; border-radius: 6px; border-left: 4px solid ${color};">
          <p style="margin: 0; font-size: 18px;"><strong>${balance}</strong> hour${balance !== 1 ? 's' : ''} remaining</p>
          ${balance <= 2 ? `<p style="margin: 4px 0; color: #ef4444; font-size: 13px;">⚠️ Low balance — <a href="${PRICING_URL}" style="color: #6366f1;">purchase more hours</a></p>` : ''}
        </div>`;
}

/**
 * Whether a just-completed class should trigger the "you're out of hours"
 * email. A debit only succeeds when the balance covers it, so landing on
 * exactly 0 happens once per time the student runs out — no extra throttle
 * needed. Skipped when auto-renew is on (a renewal charge is being fired at
 * that same moment) or the student opted out of low-credit emails.
 */
export function shouldSendOutOfHoursEmail(args: {
  newBalance: number;
  autoRenewEnabled: boolean;
  notifyLowCredits: boolean | null | undefined;
}): boolean {
  return (
    Number(args.newBalance) === 0 &&
    !args.autoRenewEnabled &&
    args.notifyLowCredits !== false
  );
}

export function buildOutOfHoursEmail(args: {
  studentName: string;
  upcomingClassCount: number;
}): { subject: string; html: string } {
  const name = escapeHtml(args.studentName || 'there');
  const n = args.upcomingClassCount;
  const upcoming =
    n > 0
      ? `<p>You have <strong>${n} upcoming class${n === 1 ? '' : 'es'}</strong> on your schedule. Your tutor won't be able to log ${n === 1 ? 'it' : 'them'} until more hours are added.</p>`
      : `<p>Add more hours to keep booking classes with your tutor.</p>`;

  return {
    subject: "You're out of tutoring hours",
    html: wrap(`
      <h2 style="color: #ef4444;">You're out of tutoring hours</h2>
      <p>Hello ${name},</p>
      <p>Your last class used your remaining hours, so your balance is now <strong>0 hours</strong>.</p>
      ${upcoming}
      ${buyHoursButton}
      <p style="font-size: 13px; color: #555;">Tip: you can turn on auto-renew in your account settings so this doesn't happen again.</p>`),
  };
}

export function buildBlockedClassLogEmail(args: {
  studentName: string;
  tutorName: string;
  subject: string;
  classDate: string; // YYYY-MM-DD
  hoursNeeded: number;
  hoursRemaining: number | null; // null = no hours ever purchased
}): { subject: string; html: string } {
  const name = escapeHtml(args.studentName || 'there');
  const tutor = escapeHtml(args.tutorName || 'Your tutor');
  const subj = escapeHtml(args.subject || 'tutoring');
  const date = formatClassDate(args.classDate);

  const balanceLine =
    args.hoursRemaining === null
      ? `<p>No hours have been purchased on this account yet.</p>`
      : `<p>This class needs <strong>${hoursLabel(args.hoursNeeded)}</strong>, but your balance is <strong>${hoursLabel(args.hoursRemaining)}</strong>.</p>`;

  return {
    subject: `Action needed: your ${args.subject || 'tutoring'} class on ${date} couldn't be recorded`,
    html: wrap(`
      <h2 style="color: #1a1a2e;">Your class couldn't be recorded</h2>
      <p>Hello ${name},</p>
      <p>${tutor} tried to log your <strong>${subj}</strong> class from <strong>${escapeHtml(date)}</strong>, but there aren't enough hours on your account.</p>
      ${balanceLine}
      <p>The session won't be recorded until more hours are added. Once they are, your tutor can log it.</p>
      ${buyHoursButton}`),
  };
}

/** Admin copy of a blocked-log notice, so it surfaces without waiting on the tutor. */
export function buildBlockedClassLogAdminEmail(args: {
  studentName: string;
  studentEmail: string;
  tutorName: string;
  subject: string;
  classDate: string;
  hoursNeeded: number;
  hoursRemaining: number | null;
}): { subject: string; html: string } {
  const date = formatClassDate(args.classDate);
  const balance =
    args.hoursRemaining === null
      ? 'no hours ever purchased'
      : `${hoursLabel(args.hoursRemaining)} left, needs ${hoursLabel(args.hoursNeeded)}`;

  return {
    subject: `[Admin] Blocked class log: ${args.studentName} (${balance})`,
    html: wrap(`
      <h2 style="color: #1a1a2e;">Class log blocked — student out of hours</h2>
      <p><strong>Student:</strong> ${escapeHtml(args.studentName)} (${escapeHtml(args.studentEmail)})</p>
      <p><strong>Tutor:</strong> ${escapeHtml(args.tutorName)}</p>
      <p><strong>Class:</strong> ${escapeHtml(args.subject)} on ${escapeHtml(date)}</p>
      <p><strong>Balance:</strong> ${escapeHtml(balance)}</p>
      <p>The family has been emailed. The class stays unlogged until hours are added.</p>`),
  };
}

function formatClassDate(ymd: string): string {
  const [y, m, d] = (ymd || '').split('-').map(Number);
  if (!y || !m || !d) return ymd || 'an earlier date';
  // Construct in UTC and format in UTC so the date never shifts a day.
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
