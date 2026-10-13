import { describeHoursActivity, formatHours as appFormatHours } from '../hours';
import { formatHours as emailFormatHours } from '../../../supabase/functions/_shared/hours';

describe.each([
  ['app', appFormatHours],
  ['email functions', emailFormatHours],
])('formatHours (%s copy)', (_name, formatHours) => {
  it('uses singular only for exactly one hour', () => {
    expect(formatHours(1)).toBe('1 hour');
    expect(formatHours(-1)).toBe('-1 hour');
    expect(formatHours(2)).toBe('2 hours');
    expect(formatHours(0)).toBe('0 hours');
  });

  it('shows half and quarter hours plainly', () => {
    expect(formatHours(1.5)).toBe('1.5 hours');
    expect(formatHours(0.5)).toBe('0.5 hours');
    expect(formatHours(6.25)).toBe('6.25 hours');
  });

  it('accepts numeric strings from the database and tidies float noise', () => {
    expect(formatHours('6.50')).toBe('6.5 hours');
    expect(formatHours('12.00')).toBe('12 hours');
    expect(formatHours(0.1 + 0.2)).toBe('0.3 hours');
  });

  it('treats missing or invalid values as zero', () => {
    expect(formatHours(null)).toBe('0 hours');
    expect(formatHours(undefined)).toBe('0 hours');
    expect(formatHours('abc')).toBe('0 hours');
  });
});

describe('describeHoursActivity', () => {
  it.each([
    ['Credit pack purchase - 12 Credit Pack', 'Purchased 12-Hour Pack'],
    [
      'Initial credit pack purchase - 4 Credit Pack (Test)',
      'Purchased 4-Hour Pack (Test)',
    ],
    ['Auto-renewal: 12 Credit Pack', 'Auto-renewal: 12-Hour Pack'],
    [
      'Credit restored - atomic class completion failed for X',
      'Hours restored - atomic class completion failed for X',
    ],
    [
      'Class completed: AR-HQ-20260908-1 (1.5hrs)',
      'Class completed: AR-HQ-20260908-1 (1.5hrs)',
    ],
    ['Purchased 8-Hour Pack', 'Purchased 8-Hour Pack'],
    [
      'Direct payment (Zelle) - Manual payment',
      'Direct payment (Zelle) - Manual payment',
    ],
  ])('%s -> %s', (input, expected) => {
    expect(describeHoursActivity(input)).toBe(expected);
  });

  it('handles empty values', () => {
    expect(describeHoursActivity(null)).toBe('');
  });
});
