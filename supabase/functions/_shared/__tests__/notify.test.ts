import {
  canEmail,
  deliver,
  getTargetForProfile,
  NotifyTarget,
} from '../notify';
import { isSendableEmail } from '../recipients';
import { reminderText, newMessageText, lowHoursText } from '../smsTexts';

const target = (over: Partial<NotifyTarget> = {}): NotifyTarget => ({
  user_id: 'u',
  email: 'pat@example.com',
  phone: '+15125550100',
  first_name: 'Pat',
  last_name: 'Lee',
  timezone: null,
  is_guardian: true,
  email_enabled: true,
  sms_enabled: true,
  ...over,
});

const senders = () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendSms: jest.fn().mockResolvedValue({ status: 'sent' }),
});

describe('deliver', () => {
  const content = { email: { subject: 'S', html: 'H' }, sms: 'T' };

  it('sends by every channel the person chose', async () => {
    const s = senders();
    await expect(deliver(target(), content, s)).resolves.toEqual({
      user_id: 'u',
      email: 'sent',
      sms: 'sent',
    });
    expect(s.sendEmail).toHaveBeenCalledWith('pat@example.com', 'S', 'H');
    expect(s.sendSms).toHaveBeenCalledWith('+15125550100', 'T');
  });

  it('respects choices', async () => {
    const s = senders();
    const r = await deliver(
      target({ email_enabled: false, sms_enabled: false }),
      content,
      s
    );
    expect(r).toMatchObject({ email: 'skipped', sms: 'skipped' });
    expect(s.sendEmail).not.toHaveBeenCalled();
    expect(s.sendSms).not.toHaveBeenCalled();
  });

  it('never emails a placeholder address', async () => {
    const s = senders();
    await deliver(
      target({
        email: 'student-1@managed.learn2lead.page',
        sms_enabled: false,
      }),
      content,
      s
    );
    expect(s.sendEmail).not.toHaveBeenCalled();
  });

  it('reports a failed channel without throwing', async () => {
    const s = senders();
    s.sendEmail.mockRejectedValue(new Error('down'));
    await expect(deliver(target(), content, s)).resolves.toMatchObject({
      email: 'failed',
      sms: 'sent',
    });
  });
});

describe('getTargetForProfile', () => {
  it('adds is_guardian: false to a single person', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{ user_id: 't', email: 't@x.com', email_enabled: true }],
      error: null,
    });
    await expect(
      getTargetForProfile({ rpc }, 't', 'class_reminders')
    ).resolves.toMatchObject({ user_id: 't', is_guardian: false });
  });
});

describe('text wording', () => {
  it('says whose class it is and ends with the opt-out notice', () => {
    const t = reminderText({
      isGuardian: true,
      studentFirstName: 'Maya',
      subject: 'Math',
      time: '4:00 PM CDT',
      tutorName: 'Tara T',
      zoomLink: 'https://zoom.us/j/1',
    });
    expect(t).toBe(
      "Learn2Lead: Maya's Math class is tomorrow at 4:00 PM CDT with Tara T. Zoom: https://zoom.us/j/1 Reply STOP to opt out."
    );
    expect(lowHoursText(1)).toContain('1 hour.');
  });

  it('keeps message previews short', () => {
    const t = newMessageText({
      senderName: 'Tara',
      aboutStudent: 'Maya',
      preview: 'x'.repeat(200),
    });
    expect(t).toContain('from Tara about Maya');
    expect(t.length).toBeLessThan(200);
  });

  it('says where to reply to a message', () => {
    expect(newMessageText({ senderName: 'Maya Lee', preview: 'Thanks!' })).toBe(
      'Learn2Lead: New message from Maya Lee: "Thanks!" Open learn2lead.page to reply. Reply STOP to opt out.'
    );
  });
});

describe('canEmail', () => {
  it.each([
    'pat@example.com',
    'student-1@managed.learn2lead.page',
    'STUDENT-1@MANAGED.LEARN2LEAD.PAGE',
    'not-an-email',
    '',
  ])('agrees with recipients.isSendableEmail for %s', (e) => {
    expect(canEmail(e)).toBe(isSendableEmail(e));
  });
});
