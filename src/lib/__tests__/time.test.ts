import {
  BUSINESS_TIMEZONE,
  classInstantsFromInput,
  classTimesForViewer,
  formatTimeWithZone,
  getViewerTimezone,
  instantToZonedParts,
  isValidTimezone,
  setViewerTimezone,
  timezoneLabel,
  zoneAbbreviation,
  zonedToInstant,
  zonesDiffer,
} from '../time';

const CT = 'America/Chicago';
const PT = 'America/Los_Angeles';
const ET = 'America/New_York';
const AZ = 'America/Phoenix';

describe('zonedToInstant', () => {
  it('converts Central clock time to the exact moment, DST-aware', () => {
    // Daylight time (CDT, UTC-5) before Nov 1, standard (CST, UTC-6) after.
    expect(zonedToInstant('2026-10-15', '16:15', CT).toISOString()).toBe(
      '2026-10-15T21:15:00.000Z'
    );
    expect(zonedToInstant('2026-11-02', '16:15', CT).toISOString()).toBe(
      '2026-11-02T22:15:00.000Z'
    );
  });

  it('handles Arizona, which never observes daylight saving', () => {
    expect(zonedToInstant('2026-07-01', '16:15', AZ).toISOString()).toBe(
      '2026-07-01T23:15:00.000Z'
    );
    expect(zonedToInstant('2026-12-01', '16:15', AZ).toISOString()).toBe(
      '2026-12-01T23:15:00.000Z'
    );
  });

  it('accepts HH:mm:ss and a local Date for the day', () => {
    expect(
      zonedToInstant(new Date(2026, 9, 15), '16:15:00', CT).toISOString()
    ).toBe('2026-10-15T21:15:00.000Z');
  });
});

describe('instantToZonedParts', () => {
  it('shows one moment as each zone’s own date and time', () => {
    const moment = '2026-10-16T02:30:00Z'; // 9:30 PM CDT Oct 15
    expect(instantToZonedParts(moment, CT)).toEqual({
      date: '2026-10-15',
      time: '21:30',
    });
    expect(instantToZonedParts(moment, PT)).toEqual({
      date: '2026-10-15',
      time: '19:30',
    });
    // Already the next day further east.
    expect(instantToZonedParts(moment, 'Asia/Tokyo')).toEqual({
      date: '2026-10-16',
      time: '11:30',
    });
  });
});

describe('zone labels', () => {
  it('gives the DST-correct abbreviation for the class date', () => {
    expect(zoneAbbreviation('2026-10-15T21:15:00Z', CT)).toBe('CDT');
    expect(zoneAbbreviation('2026-11-02T22:15:00Z', CT)).toBe('CST');
    expect(zoneAbbreviation('2026-10-15T21:15:00Z', PT)).toBe('PDT');
    expect(zoneAbbreviation('2026-07-01T23:15:00Z', AZ)).toBe('MST');
  });

  it('formats a time with its zone', () => {
    expect(formatTimeWithZone('2026-10-15T21:15:00Z', CT)).toBe('4:15 PM CDT');
    expect(formatTimeWithZone('2026-10-15T21:15:00Z', PT)).toBe('2:15 PM PDT');
  });

  it('names common zones plainly and falls back for others', () => {
    expect(timezoneLabel(PT)).toBe('Pacific Time');
    expect(timezoneLabel('Europe/London')).toContain('Europe/London');
  });

  it('detects when two zones show different clock times', () => {
    expect(zonesDiffer('2026-10-15T21:15:00Z', CT, PT)).toBe(true);
    expect(zonesDiffer('2026-10-15T21:15:00Z', CT, 'America/Winnipeg')).toBe(
      false
    );
  });
});

describe('classTimesForViewer', () => {
  const row = {
    start_at: '2026-10-15T21:15:00Z',
    end_at: '2026-10-15T22:15:00Z',
    date: '2026-10-15',
    start_time: '16:15:00',
    end_time: '17:15:00',
  };

  it('shows the class in the viewer’s zone', () => {
    expect(classTimesForViewer(row, PT)).toMatchObject({
      date: '2026-10-15',
      startTime: '14:15',
      endTime: '15:15',
      tzAbbr: 'PDT',
      startAt: '2026-10-15T21:15:00.000Z',
    });
    expect(classTimesForViewer(row, CT)).toMatchObject({
      startTime: '16:15',
      endTime: '17:15',
      tzAbbr: 'CDT',
    });
  });

  it('treats legacy rows without start_at as Central clock time', () => {
    const legacy = {
      date: '2026-10-15',
      start_time: '16:15:00',
      end_time: '17:15:00',
    };
    expect(classTimesForViewer(legacy, ET)).toMatchObject({
      startTime: '17:15',
      endTime: '18:15',
      startAt: '2026-10-15T21:15:00.000Z',
    });
  });

  it('handles a legacy class that ends after midnight', () => {
    const late = {
      date: '2026-10-15',
      start_time: '23:30:00',
      end_time: '00:30:00',
    };
    const t = classTimesForViewer(late, CT);
    expect(t.endAt).toBe('2026-10-16T05:30:00.000Z');
  });

  it('falls back gracefully when there is no usable time', () => {
    expect(classTimesForViewer({ date: '2026-10-15' }, CT)).toMatchObject({
      date: '2026-10-15',
      startTime: '',
      startAt: null,
    });
  });
});

describe('classInstantsFromInput', () => {
  it('stores a Pacific tutor’s 2:15 PM class as 4:15 PM Central', () => {
    const { start_at, end_at } = classInstantsFromInput(
      '2026-10-15',
      '14:15',
      '15:15',
      PT
    );
    expect(instantToZonedParts(start_at, CT).time).toBe('16:15');
    expect(instantToZonedParts(end_at, CT).time).toBe('17:15');
  });

  it('keeps a weekly class at the same local time across the DST change', () => {
    const before = classInstantsFromInput('2026-10-29', '16:15', '17:15', CT);
    const after = classInstantsFromInput('2026-11-05', '16:15', '17:15', CT);
    expect(before.start_at).toBe('2026-10-29T21:15:00.000Z');
    expect(after.start_at).toBe('2026-11-05T22:15:00.000Z');
  });

  it('treats an end time at or before the start as the next day', () => {
    const { start_at, end_at } = classInstantsFromInput(
      '2026-10-15',
      '23:30',
      '00:30',
      CT
    );
    expect(start_at).toBe('2026-10-16T04:30:00.000Z');
    expect(end_at).toBe('2026-10-16T05:30:00.000Z');
  });
});

describe('viewer timezone', () => {
  afterEach(() => setViewerTimezone(null));

  it('validates zone names', () => {
    expect(isValidTimezone(PT)).toBe(true);
    expect(isValidTimezone('Mars/Olympus')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
  });

  it('uses the saved zone, ignoring invalid ones', () => {
    setViewerTimezone(PT);
    expect(getViewerTimezone()).toBe(PT);
    setViewerTimezone('Mars/Olympus');
    expect(getViewerTimezone()).not.toBe('Mars/Olympus');
  });

  it('falls back to the device zone, then Central', () => {
    setViewerTimezone(null);
    expect(isValidTimezone(getViewerTimezone())).toBe(true);
    expect(BUSINESS_TIMEZONE).toBe(CT);
  });
});
