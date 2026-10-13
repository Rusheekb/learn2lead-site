import {
  isValidCronSecret,
  requireCronSecret,
  CRON_SECRET_HEADER,
} from '../cronAuth';

describe('isValidCronSecret', () => {
  it('accepts the exact secret', () => {
    expect(isValidCronSecret('s3cret-value', 's3cret-value')).toBe(true);
  });

  it('rejects a wrong secret of the same length', () => {
    expect(isValidCronSecret('s3cret-valuX', 's3cret-value')).toBe(false);
  });

  it('rejects a secret of a different length', () => {
    expect(isValidCronSecret('s3cret', 's3cret-value')).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(isValidCronSecret(null, 's3cret-value')).toBe(false);
    expect(isValidCronSecret('', 's3cret-value')).toBe(false);
  });

  it('fails closed when no secret is configured', () => {
    expect(isValidCronSecret('anything', undefined)).toBe(false);
    expect(isValidCronSecret('', '')).toBe(false);
  });
});

describe('requireCronSecret', () => {
  // Minimal stand-ins for the fetch Request/Response globals, which aren't
  // available in this Jest environment.
  const OriginalResponse = (global as any).Response;
  beforeAll(() => {
    (global as any).Response = class {
      status: number;
      constructor(
        public body: string,
        init: { status: number }
      ) {
        this.status = init.status;
      }
    };
  });
  afterAll(() => {
    (global as any).Response = OriginalResponse;
  });

  const req = (secret?: string) =>
    ({
      headers: {
        get: (name: string) =>
          name === CRON_SECRET_HEADER ? (secret ?? null) : null,
      },
    }) as unknown as Request;

  it('returns null (proceed) for a valid secret', () => {
    expect(requireCronSecret(req('abc123'), {}, 'abc123')).toBeNull();
  });

  it('returns a 401 for a missing or wrong secret', () => {
    expect(requireCronSecret(req(), {}, 'abc123')?.status).toBe(401);
    expect(requireCronSecret(req('nope00'), {}, 'abc123')?.status).toBe(401);
  });
});
