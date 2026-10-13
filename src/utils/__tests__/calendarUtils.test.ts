import {
  buildIcsContent,
  createGoogleCalendarUrl,
  createOutlookCalendarUrl,
  resolveEventRange,
} from '../calendarUtils';
import { setViewerTimezone } from '@/lib/time';

// A 4:15–5:15 PM Central class on Oct 15 (CDT) is 21:15–22:15 UTC.
const event = {
  id: 'abc',
  title: 'Math',
  date: '2026-10-15',
  startTime: '14:15', // as shown to a Pacific viewer
  endTime: '15:15',
  startAt: '2026-10-15T21:15:00.000Z',
  endAt: '2026-10-15T22:15:00.000Z',
  zoomLink: 'https://zoom.us/j/1',
  notes: 'Bring homework',
};

describe('calendar exports', () => {
  afterEach(() => setViewerTimezone(null));

  it('uses the exact start/end when available', () => {
    const r = resolveEventRange(event)!;
    expect(r.start.toISOString()).toBe('2026-10-15T21:15:00.000Z');
    expect(r.end.toISOString()).toBe('2026-10-15T22:15:00.000Z');
  });

  it('falls back to date + times in the viewer’s zone', () => {
    setViewerTimezone('America/Los_Angeles');
    const r = resolveEventRange({ ...event, startAt: null, endAt: null })!;
    expect(r.start.toISOString()).toBe('2026-10-15T21:15:00.000Z');
  });

  it('returns null for unusable times', () => {
    expect(
      resolveEventRange({
        ...event,
        startAt: null,
        endAt: null,
        startTime: 'bad',
      })
    ).toBeNull();
  });

  it('Google link carries UTC times, so every calendar places it correctly', () => {
    const url = new URL(createGoogleCalendarUrl(event));
    expect(url.searchParams.get('dates')).toBe(
      '20261015T211500Z/20261015T221500Z'
    );
    expect(url.searchParams.get('details')).toContain('Join Zoom Meeting');
  });

  it('Outlook link carries ISO UTC times', () => {
    const url = new URL(createOutlookCalendarUrl(event));
    expect(url.searchParams.get('startdt')).toBe('2026-10-15T21:15:00.000Z');
    expect(url.searchParams.get('enddt')).toBe('2026-10-15T22:15:00.000Z');
  });

  it('.ics file uses UTC DTSTART/DTEND', () => {
    const ics = buildIcsContent(event)!;
    expect(ics).toContain('DTSTART:20261015T211500Z');
    expect(ics).toContain('DTEND:20261015T221500Z');
    expect(ics).toContain('UID:abc@learn2lead.page');
  });

  it('returns # rather than a broken link for invalid events', () => {
    expect(
      createGoogleCalendarUrl({
        ...event,
        startAt: null,
        endAt: null,
        endTime: '',
      })
    ).toBe('#');
  });
});
