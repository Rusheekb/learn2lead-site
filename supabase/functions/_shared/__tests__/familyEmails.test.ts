import {
  buildFamilyDigestEmail,
  buildGuardianInviteEmail,
  childHasActivity,
  DigestChild,
} from '../familyEmails';

const maya: DigestChild = {
  name: 'Maya Lee',
  upcoming: [
    {
      date: 'Mon, Oct 19',
      time: '4:00 PM CDT',
      subject: 'Math',
      title: 'Algebra',
    },
  ],
  completed: { count: 2, hours: 2.5, subjects: ['Math', 'Science'] },
};
const idle: DigestChild = { name: 'Sam Lee', upcoming: [], completed: null };

describe('childHasActivity', () => {
  it('is true with upcoming or completed classes', () => {
    expect(childHasActivity(maya)).toBe(true);
    expect(
      childHasActivity({
        ...idle,
        completed: { count: 1, hours: 1, subjects: [] },
      })
    ).toBe(true);
  });
  it('is false with neither', () => {
    expect(childHasActivity(idle)).toBe(false);
  });
});

describe('buildFamilyDigestEmail', () => {
  const email = buildFamilyDigestEmail({
    parentName: 'Pat',
    weekOf: 'October 19, 2026',
    children: [maya, idle],
    creditHtml: '<p>BALANCE</p>',
  });

  it('addresses the parent and names the week', () => {
    expect(email.subject).toBe(
      "Your Family's Weekly Learn2Lead Digest — October 19, 2026"
    );
    expect(email.html).toContain('Hello Pat,');
  });

  it('includes each active child with their classes and summary', () => {
    expect(email.html).toContain('Maya Lee');
    expect(email.html).toContain('Algebra');
    expect(email.html).toContain(
      '<strong>2</strong> classes completed last week'
    );
    expect(email.html).toContain('<strong>2.5</strong> hours');
    expect(email.html).toContain('Math, Science');
  });

  it('leaves out children with nothing to report', () => {
    expect(email.html).not.toContain('Sam Lee');
  });

  it('includes the family balance section and the family dashboard link', () => {
    expect(email.html).toContain('<p>BALANCE</p>');
    expect(email.html).toContain('https://learn2lead.page/family');
  });

  it('escapes names', () => {
    const html = buildFamilyDigestEmail({
      parentName: '<b>x</b>',
      weekOf: 'w',
      children: [{ ...maya, name: '<script>' }],
      creditHtml: '',
    }).html;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('buildGuardianInviteEmail', () => {
  const email = buildGuardianInviteEmail({
    studentName: 'Tess Teen',
    token: '00000000-0000-0000-0000-000000000001',
    expiresOn: 'October 29, 2026',
  });

  it('names the student and links to the accept page with the token', () => {
    expect(email.subject).toBe('Tess Teen invited you to Learn2Lead');
    expect(email.html).toContain('<strong>Tess Teen</strong>');
    expect(email.html).toContain(
      'https://learn2lead.page/accept-invite?token=00000000-0000-0000-0000-000000000001'
    );
  });

  it('says plainly that the parent takes over hours and payments', () => {
    expect(email.html).toContain(
      "you'll manage their tutoring hours and payments"
    );
    expect(email.html).toContain('October 29, 2026');
  });
});
