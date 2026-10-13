import {
  BUSINESS_TIMEZONE,
  formatDateInZone,
  formatTimeInZone,
  safeZone,
} from '../timeFormat';

// 4:15 PM Central on Thu Oct 15 2026 (CDT) = 21:15 UTC.
const CLASS = '2026-10-15T21:15:00Z';

describe('timeFormat', () => {
  it('formats the time in each recipient’s zone with a DST-correct label', () => {
    expect(formatTimeInZone(CLASS, 'America/Chicago')).toBe('4:15 PM CDT');
    expect(formatTimeInZone(CLASS, 'America/Los_Angeles')).toBe('2:15 PM PDT');
    // After DST ends Nov 1: standard time.
    expect(formatTimeInZone('2026-11-05T22:15:00Z', 'America/Chicago')).toBe(
      '4:15 PM CST'
    );
  });

  it('formats the date in the recipient’s zone', () => {
    expect(formatDateInZone(CLASS, 'America/Chicago')).toBe(
      'Thursday, October 15'
    );
    // 9:30 PM Central is already Friday in Tokyo.
    expect(formatDateInZone('2026-10-16T02:30:00Z', 'Asia/Tokyo')).toBe(
      'Friday, October 16'
    );
  });

  it('falls back to Central for missing or invalid zones', () => {
    expect(safeZone(null)).toBe(BUSINESS_TIMEZONE);
    expect(safeZone('Mars/Olympus')).toBe(BUSINESS_TIMEZONE);
    expect(safeZone('America/Denver')).toBe('America/Denver');
    expect(formatTimeInZone(CLASS, 'Mars/Olympus')).toBe('4:15 PM CDT');
  });
});
