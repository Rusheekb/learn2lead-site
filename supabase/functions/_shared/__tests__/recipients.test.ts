import {
  MANAGED_EMAIL_DOMAIN,
  managedStudentEmail,
  isPlaceholderEmail,
  isSendableEmail,
  getStudentRecipients,
  getBillingAccountId,
  audienceFor,
  fullName,
} from '../recipients';

describe('placeholder addresses', () => {
  it('builds a placeholder on the managed domain', () => {
    expect(managedStudentEmail('abc')).toBe(
      `student-abc@${MANAGED_EMAIL_DOMAIN}`
    );
  });

  it('recognises placeholders regardless of case and spacing', () => {
    expect(isPlaceholderEmail('student-1@managed.learn2lead.page')).toBe(true);
    expect(isPlaceholderEmail(' Student-1@MANAGED.Learn2Lead.page ')).toBe(
      true
    );
    expect(isPlaceholderEmail('parent@gmail.com')).toBe(false);
    expect(isPlaceholderEmail('')).toBe(false);
    expect(isPlaceholderEmail(null)).toBe(false);
  });

  it('never treats a placeholder as sendable', () => {
    expect(isSendableEmail(managedStudentEmail('x'))).toBe(false);
  });

  it('accepts real addresses and rejects junk', () => {
    expect(isSendableEmail('parent@gmail.com')).toBe(true);
    expect(isSendableEmail('not-an-email')).toBe(false);
    expect(isSendableEmail(undefined)).toBe(false);
    // An address on the real site domain is fine; only the subdomain is reserved.
    expect(isSendableEmail('noreply@learn2lead.page')).toBe(true);
  });
});

describe('getStudentRecipients', () => {
  const row = (email: string, is_guardian: boolean) => ({
    user_id: 'u',
    email,
    first_name: 'A',
    last_name: 'B',
    timezone: null,
    is_guardian,
    notify_class_reminders: true,
    notify_low_credits: true,
  });

  it('calls the recipients RPC with the category', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({ data: [row('a@x.com', false)], error: null });
    const result = await getStudentRecipients({ rpc }, 'student-1', 'student');
    expect(rpc).toHaveBeenCalledWith('student_notification_recipients', {
      p_student_id: 'student-1',
      p_category: 'student',
    });
    expect(result.map((r) => r.email)).toEqual(['a@x.com']);
  });

  it('drops placeholder and invalid addresses (defense in depth)', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        row('parent@x.com', true),
        row(managedStudentEmail('1'), false),
        row('', false),
      ],
      error: null,
    });
    const result = await getStudentRecipients({ rpc }, 's', 'student');
    expect(result.map((r) => r.email)).toEqual(['parent@x.com']);
  });

  it('throws when the lookup fails, so callers can fall back', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(
      getStudentRecipients({ rpc }, 's', 'parent_only')
    ).rejects.toThrow('boom');
  });

  it('treats no rows as no recipients', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    await expect(
      getStudentRecipients({ rpc }, 's', 'student')
    ).resolves.toEqual([]);
  });
});

describe('getBillingAccountId', () => {
  it('returns the paying account', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'parent-id', error: null });
    await expect(getBillingAccountId({ rpc }, 'child-id')).resolves.toBe(
      'parent-id'
    );
    expect(rpc).toHaveBeenCalledWith('billing_account_for', {
      p_student_id: 'child-id',
    });
  });

  it('falls back to the student when nothing comes back', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    await expect(getBillingAccountId({ rpc }, 'student-id')).resolves.toBe(
      'student-id'
    );
  });

  it('throws on errors', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'nope' } });
    await expect(getBillingAccountId({ rpc }, 's')).rejects.toThrow('nope');
  });
});

describe('audienceFor', () => {
  it('speaks to a student directly', () => {
    expect(
      audienceFor(
        { is_guardian: false, first_name: 'Maya', last_name: 'Lee' },
        'Maya'
      )
    ).toEqual({ greetingName: 'Maya Lee', possessive: 'your', subject: 'you' });
  });

  it('speaks to a parent about their child', () => {
    expect(
      audienceFor(
        { is_guardian: true, first_name: 'Pat', last_name: 'Lee' },
        'Maya'
      )
    ).toEqual({ greetingName: 'Pat', possessive: "Maya's", subject: 'Maya' });
  });

  it('has sensible fallbacks for missing names', () => {
    expect(audienceFor({ is_guardian: true, first_name: null }, null)).toEqual({
      greetingName: 'there',
      possessive: "your child's",
      subject: 'your child',
    });
  });
});

describe('fullName', () => {
  it('joins names and falls back', () => {
    expect(fullName({ first_name: 'A', last_name: 'B' })).toBe('A B');
    expect(fullName({ first_name: 'A', last_name: null })).toBe('A');
    expect(fullName(null, 'x')).toBe('x');
  });
});
