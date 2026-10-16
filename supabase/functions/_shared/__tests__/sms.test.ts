import {
  isSmsConfigured,
  isValidTwilioSignature,
  normalizePhone,
  sendSms,
  trimSms,
} from '../sms';
import { webcrypto } from 'crypto';

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
  }
});

describe('normalizePhone', () => {
  it.each([
    ['(512) 555-0100', '+15125550100'],
    ['512.555.0100', '+15125550100'],
    ['1 512 555 0100', '+15125550100'],
    ['+44 20 7946 0958', '+442079460958'],
  ])('%s -> %s', (input, out) => expect(normalizePhone(input)).toBe(out));

  it.each(['555-0100', '', 'abc', '+0123'])('rejects %s', (input) =>
    expect(normalizePhone(input)).toBeNull()
  );
});

describe('trimSms', () => {
  it('keeps short texts and trims long ones on a word', () => {
    expect(trimSms('hello  there')).toBe('hello there');
    const long = trimSms('word '.repeat(100), 50);
    expect(long.length).toBeLessThanOrEqual(50);
    expect(long.endsWith('…')).toBe(true);
  });
});

describe('sendSms', () => {
  const config = {
    accountSid: 'AC1',
    authToken: 'tok',
    messagingServiceSid: 'MG1',
    apiBase: 'http://twilio.test',
  };

  it('skips quietly when Twilio is not configured', async () => {
    expect(isSmsConfigured({})).toBe(false);
    await expect(sendSms({}, '+15125550100', 'hi')).resolves.toEqual({
      status: 'skipped',
      reason: 'not_configured',
    });
  });

  it('posts to Twilio with the messaging service', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sid: 'SM1' }),
    });
    const result = await sendSms(config, '+15125550100', 'hi', fetchImpl);
    expect(result).toEqual({ status: 'sent', sid: 'SM1' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(
      'http://twilio.test/2010-04-01/Accounts/AC1/Messages.json'
    );
    const body = new URLSearchParams(init.body);
    expect(body.get('To')).toBe('+15125550100');
    expect(body.get('MessagingServiceSid')).toBe('MG1');
    expect(init.headers.Authorization).toBe(`Basic ${btoa('AC1:tok')}`);
  });

  it('reports failures without throwing', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Invalid To' }),
    });
    await expect(sendSms(config, '+1', 'hi', fetchImpl)).resolves.toEqual({
      status: 'failed',
      error: 'Invalid To',
    });
  });
});

describe('isValidTwilioSignature', () => {
  // Twilio's documented example.
  const url = 'https://mycompany.com/myapp.php?foo=1&bar=2';
  const params = {
    CallSid: 'CA1234567890ABCDE',
    Caller: '+12349013030',
    Digits: '1234',
    From: '+12349013030',
    To: '+18005551212',
  };

  it('accepts a correct signature', async () => {
    await expect(
      isValidTwilioSignature(
        '12345',
        url,
        params,
        '0/KCTR6DLpKmkAf8muzZqo1nDgQ='
      )
    ).resolves.toBe(true);
  });

  it('rejects a wrong one or a missing token', async () => {
    await expect(
      isValidTwilioSignature('12345', url, params, 'bad=')
    ).resolves.toBe(false);
    await expect(isValidTwilioSignature('', url, params, 'x')).resolves.toBe(
      false
    );
  });
});
