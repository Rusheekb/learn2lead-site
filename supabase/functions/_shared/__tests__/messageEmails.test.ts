import {
  aboutStudentFor,
  buildNewMessageEmail,
  messagesPathFor,
  previewOf,
} from '../messageEmails';

describe('messagesPathFor', () => {
  it.each([
    ['student', '/dashboard?tab=messages&thread=t1'],
    ['tutor', '/tutor-dashboard?tab=messages&thread=t1'],
    ['parent', '/family?tab=messages&thread=t1'],
    ['staff', '/admin-dashboard?tab=messages&thread=t1'],
    ['former', '/dashboard?tab=messages&thread=t1'],
  ] as const)('sends a %s to their own messages page', (role, path) => {
    expect(messagesPathFor(role, 't1')).toBe(path);
  });
});

describe('aboutStudentFor', () => {
  it('names the student for parents, tutors and staff', () => {
    for (const recipientRole of ['parent', 'tutor', 'staff'] as const) {
      expect(
        aboutStudentFor({
          recipientRole,
          senderIsStudent: false,
          studentFirstName: 'Maya',
        })
      ).toBe('Maya');
    }
  });

  it('not for the student, or when the student is writing', () => {
    expect(
      aboutStudentFor({
        recipientRole: 'student',
        senderIsStudent: false,
        studentFirstName: 'Maya',
      })
    ).toBeNull();
    expect(
      aboutStudentFor({
        recipientRole: 'tutor',
        senderIsStudent: true,
        studentFirstName: 'Maya',
      })
    ).toBeNull();
  });
});

describe('previewOf', () => {
  it('flattens whitespace and shortens long messages', () => {
    expect(previewOf('  Hi\n\nthere  ')).toBe('Hi there');
    const long = previewOf('word '.repeat(100), 20);
    expect(long.length).toBeLessThanOrEqual(20);
    expect(long.endsWith('…')).toBe(true);
  });
});

describe('buildNewMessageEmail', () => {
  const email = buildNewMessageEmail({
    recipientName: 'Pat',
    senderName: 'Tara Tutor',
    aboutStudent: 'Maya',
    body: 'Bring <b>fractions</b> & a calculator',
    path: '/family?tab=messages&thread=t1',
  });

  it('says who wrote and about whom', () => {
    expect(email.subject).toBe('New message from Tara Tutor about Maya');
    expect(email.html).toContain('Hello Pat,');
  });

  it('escapes the message and links to the conversation', () => {
    expect(email.html).toContain(
      'Bring &lt;b&gt;fractions&lt;/b&gt; &amp; a calculator'
    );
    expect(email.html).not.toContain('<b>fractions');
    expect(email.html).toContain(
      'https://learn2lead.page/family?tab=messages&thread=t1'
    );
  });

  it('drops "about" when there is no one to name', () => {
    expect(
      buildNewMessageEmail({
        recipientName: '',
        senderName: 'Maya Lee',
        aboutStudent: null,
        body: 'Thanks!',
        path: '/tutor-dashboard?tab=messages&thread=t1',
      }).subject
    ).toBe('New message from Maya Lee');
  });
});
