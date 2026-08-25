import { resolveClassesPerMonth } from '../renewalPackMapping';

describe('resolveClassesPerMonth', () => {
  it('maps basic to 4 classes per month', () => {
    expect(resolveClassesPerMonth('basic')).toBe(4);
  });

  it('maps standard to 8 classes per month', () => {
    expect(resolveClassesPerMonth('standard')).toBe(8);
  });

  it('maps premium to 12 classes per month', () => {
    expect(resolveClassesPerMonth('premium')).toBe(12);
  });

  it('never resolves to a value that only exists as a plan-name string', () => {
    // Regression guard: process-auto-renewal used to match against plan NAME
    // strings ('Basic Plan', etc.) that never existed in subscription_plans,
    // silently failing every auto-renewal since launch. This function must
    // only ever produce a classes_per_month number, never a name.
    const result = resolveClassesPerMonth('basic');
    expect(typeof result).toBe('number');
  });

  it('falls back to 8 for an unrecognized pack instead of throwing', () => {
    expect(resolveClassesPerMonth('unknown_pack')).toBe(8);
  });
});
