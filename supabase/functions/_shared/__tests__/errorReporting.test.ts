import { webcrypto } from 'crypto';
import {
  buildEnvelope,
  envelopeUrl,
  parseDsn,
  reportError,
} from '../errorReporting';

beforeAll(() => {
  if (!globalThis.crypto?.randomUUID) {
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      configurable: true,
    });
  }
});

const DSN = 'https://abc123@o1.ingest.us.sentry.io/4567';

describe('parseDsn', () => {
  it('reads the key, host and project', () => {
    expect(parseDsn(DSN)).toEqual({
      protocol: 'https',
      publicKey: 'abc123',
      host: 'o1.ingest.us.sentry.io',
      projectId: '4567',
    });
  });

  it.each([undefined, '', 'not a dsn', 'https://o1.sentry.io/1'])(
    'rejects %p',
    (dsn) => expect(parseDsn(dsn)).toBeNull()
  );
});

describe('envelopeUrl', () => {
  it('posts to the project envelope endpoint with the public key', () => {
    const url = new URL(envelopeUrl(parseDsn(DSN)!));
    expect(url.origin + url.pathname).toBe(
      'https://o1.ingest.us.sentry.io/api/4567/envelope/'
    );
    expect(url.searchParams.get('sentry_key')).toBe('abc123');
    expect(url.searchParams.get('sentry_version')).toBe('7');
  });
});

describe('buildEnvelope', () => {
  it('tags the function and keeps the error message', () => {
    const lines = buildEnvelope({
      functionName: 'deduct-class-credit',
      error: new TypeError('boom'),
      extra: { classId: 'c1' },
      eventId: 'e'.repeat(32),
      now: new Date('2026-10-17T00:00:00Z'),
      environment: 'production',
    }).split('\n');
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[1])).toEqual({ type: 'event' });
    const event = JSON.parse(lines[2]);
    expect(event.tags).toEqual({
      runtime: 'edge-function',
      function: 'deduct-class-credit',
    });
    expect(event.exception.values[0]).toEqual({
      type: 'TypeError',
      value: 'boom',
    });
    expect(event.extra.classId).toBe('c1');
    expect(event.timestamp).toBe(Date.parse('2026-10-17T00:00:00Z') / 1000);
  });

  it('accepts non-Error values', () => {
    const event = JSON.parse(
      buildEnvelope({
        functionName: 'f',
        error: 'plain string',
        eventId: 'x',
        now: new Date(),
        environment: 'production',
      }).split('\n')[2]
    );
    expect(event.exception.values[0].value).toBe('plain string');
  });
});

describe('reportError', () => {
  it('does nothing without a DSN', async () => {
    const fetchImpl = jest.fn();
    await reportError('f', new Error('x'), undefined, {
      dsn: null,
      fetchImpl,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends one envelope when configured', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true });
    await reportError('send-message', new Error('x'), undefined, {
      dsn: DSN,
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('/api/4567/envelope/');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/x-sentry-envelope');
  });

  it('never throws, even if Sentry is unreachable', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(
      reportError('f', new Error('x'), undefined, { dsn: DSN, fetchImpl })
    ).resolves.toBeUndefined();
  });
});
