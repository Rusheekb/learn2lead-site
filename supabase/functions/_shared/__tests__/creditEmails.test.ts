import {
  buildDigestCreditSection,
  shouldSendOutOfHoursEmail,
  buildOutOfHoursEmail,
  buildBlockedClassLogEmail,
  buildBlockedClassLogAdminEmail,
} from '../creditEmails';

describe('buildDigestCreditSection', () => {
  it('omits the section entirely when the balance could not be read', () => {
    // Regression: an unreadable balance used to default to 0, telling every
    // family in the weekly digest they were out of hours.
    expect(buildDigestCreditSection(null)).toBe('');
    expect(buildDigestCreditSection(NaN)).toBe('');
  });

  it('shows the real balance with a healthy color', () => {
    const html = buildDigestCreditSection(8);
    expect(html).toContain('<strong>8</strong> hours remaining');
    expect(html).toContain('#22c55e');
    expect(html).not.toContain('Low balance');
  });

  it('warns at 2 hours or less and uses singular for 1', () => {
    const html = buildDigestCreditSection(1);
    expect(html).toContain('<strong>1</strong> hour remaining');
    expect(html).toContain('Low balance');
  });

  it('still shows a genuine 0 balance', () => {
    expect(buildDigestCreditSection(0)).toContain('<strong>0</strong> hours');
  });

  it('uses the amber color between 3 and 4 hours', () => {
    expect(buildDigestCreditSection(4)).toContain('#f59e0b');
  });
});

describe('shouldSendOutOfHoursEmail', () => {
  const base = { autoRenewEnabled: false, notifyLowCredits: true };

  it('sends when the balance lands on exactly 0', () => {
    expect(shouldSendOutOfHoursEmail({ ...base, newBalance: 0 })).toBe(true);
  });

  it('does not send while hours remain', () => {
    expect(shouldSendOutOfHoursEmail({ ...base, newBalance: 0.5 })).toBe(false);
  });

  it('skips when auto-renew is about to recharge', () => {
    expect(
      shouldSendOutOfHoursEmail({
        ...base,
        newBalance: 0,
        autoRenewEnabled: true,
      })
    ).toBe(false);
  });

  it('respects the low-credit opt-out, treating unset as opted in', () => {
    expect(
      shouldSendOutOfHoursEmail({
        ...base,
        newBalance: 0,
        notifyLowCredits: false,
      })
    ).toBe(false);
    expect(
      shouldSendOutOfHoursEmail({
        ...base,
        newBalance: 0,
        notifyLowCredits: null,
      })
    ).toBe(true);
  });
});

describe('buildOutOfHoursEmail', () => {
  it('mentions upcoming classes that cannot be logged', () => {
    const { subject, html } = buildOutOfHoursEmail({
      studentName: 'Kai Giorgio',
      upcomingClassCount: 2,
    });
    expect(subject).toBe("You're out of tutoring hours");
    expect(html).toContain('Hello Kai Giorgio');
    expect(html).toContain('2 upcoming classes');
    expect(html).toContain('log them');
    expect(html).toContain('https://learn2lead.page/pricing');
  });

  it('uses singular wording for one upcoming class', () => {
    const { html } = buildOutOfHoursEmail({
      studentName: 'Kai',
      upcomingClassCount: 1,
    });
    expect(html).toContain('1 upcoming class</strong>');
    expect(html).toContain('log it');
  });

  it('falls back gracefully with no upcoming classes or name', () => {
    const { html } = buildOutOfHoursEmail({
      studentName: '',
      upcomingClassCount: 0,
    });
    expect(html).toContain('Hello there');
    expect(html).toContain('keep booking classes');
  });

  it("names the child in a parent's copy", () => {
    const { html } = buildOutOfHoursEmail({
      studentName: 'Pat',
      upcomingClassCount: 2,
      childName: 'Maya',
    });
    expect(html).toContain('Hello Pat');
    expect(html).toContain("Maya's last class used your remaining hours");
    expect(html).toContain('Your family has <strong>2 upcoming classes');
  });
});

describe('buildBlockedClassLogEmail', () => {
  const args = {
    studentName: 'Viaan Barot',
    tutorName: 'Hammada Qazzafi',
    subject: 'Mathematics',
    classDate: '2026-10-08',
    hoursNeeded: 1,
    hoursRemaining: 0,
  };

  it('explains which class was blocked and why, without shifting the date', () => {
    const { subject, html } = buildBlockedClassLogEmail(args);
    expect(subject).toContain('Mathematics class on Thu, Oct 8');
    expect(html).toContain('Hammada Qazzafi tried to log');
    expect(html).toContain('needs <strong>1 hour</strong>');
    expect(html).toContain('balance is <strong>0 hours</strong>');
    expect(html).toContain('Buy More Hours');
  });

  it('handles a student who never purchased hours', () => {
    const { html } = buildBlockedClassLogEmail({
      ...args,
      hoursRemaining: null,
    });
    expect(html).toContain('No hours have been purchased');
  });

  it("names the child in a parent's copy", () => {
    const { subject, html } = buildBlockedClassLogEmail({
      ...args,
      studentName: 'Pat',
      childName: 'Maya',
    });
    expect(subject).toContain("Action needed: Maya's ");
    expect(html).toContain("Maya's class couldn't be recorded");
    expect(html).toContain("tried to log Maya's <strong>");
    expect(html).toContain('Hello Pat');
  });

  it('escapes user-supplied text', () => {
    const { html } = buildBlockedClassLogEmail({
      ...args,
      tutorName: '<script>x</script>',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('tolerates a malformed date and missing fields', () => {
    const { subject, html } = buildBlockedClassLogEmail({
      ...args,
      classDate: '',
      subject: '',
      tutorName: '',
      studentName: '',
    });
    expect(subject).toContain('tutoring class on an earlier date');
    expect(html).toContain('Your tutor tried to log');
  });
});

describe('buildBlockedClassLogAdminEmail', () => {
  it('summarizes the blocked log for the admin', () => {
    const { subject, html } = buildBlockedClassLogAdminEmail({
      studentName: 'Viaan Barot',
      studentEmail: 'sid7barot@gmail.com',
      tutorName: 'Hammada Qazzafi',
      subject: 'Mathematics',
      classDate: '2026-10-08',
      hoursNeeded: 1.5,
      hoursRemaining: 1,
    });
    expect(subject).toBe(
      '[Admin] Blocked class log: Viaan Barot (1 hour left, needs 1.5 hours)'
    );
    expect(html).toContain('sid7barot@gmail.com');
    expect(html).toContain('Mathematics on Thu, Oct 8');
  });

  it('labels a student who never purchased hours', () => {
    const { subject } = buildBlockedClassLogAdminEmail({
      studentName: 'X',
      studentEmail: 'x@y.z',
      tutorName: 'T',
      subject: 'Math',
      classDate: '2026-10-08',
      hoursNeeded: 1,
      hoursRemaining: null,
    });
    expect(subject).toContain('no hours ever purchased');
  });
});
