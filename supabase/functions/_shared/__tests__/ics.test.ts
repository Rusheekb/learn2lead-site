import { buildIcsCalendar, escapeIcsText, foldIcsLine, toIcsUtc } from '../ics';

describe('ics helpers', () => {
  it('formats exact UTC moments', () => {
    expect(toIcsUtc('2026-10-15T21:15:00.000Z')).toBe('20261015T211500Z');
  });

  it('escapes text per RFC 5545', () => {
    expect(escapeIcsText('Math; algebra, ch. 3\nbring notes\\')).toBe(
      'Math\\; algebra\\, ch. 3\\nbring notes\\\\'
    );
  });

  it('folds long lines at 75 octets with a leading space', () => {
    const long = 'DESCRIPTION:' + 'x'.repeat(200);
    const folded = foldIcsLine(long);
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0].length).toBe(75);
    lines.slice(1).forEach((l) => {
      expect(l.startsWith(' ')).toBe(true);
      expect(l.length).toBeLessThanOrEqual(75);
    });
    expect(lines.map((l, i) => (i ? l.slice(1) : l)).join('')).toBe(long);
  });

  it('leaves short lines alone and counts multi-byte characters', () => {
    expect(foldIcsLine('SUMMARY:short')).toBe('SUMMARY:short');
    const folded = foldIcsLine('SUMMARY:' + 'é'.repeat(60));
    folded
      .split('\r\n')
      .forEach((l) =>
        expect(Buffer.byteLength(l, 'utf8')).toBeLessThanOrEqual(75)
      );
  });
});

describe('buildIcsCalendar', () => {
  const ics = buildIcsCalendar(
    [
      {
        id: 'c1',
        title: 'Mathematics with Ariana Rayi',
        startAt: '2026-10-15T21:15:00Z',
        endAt: '2026-10-15T22:15:00Z',
        description: 'Join Zoom: https://zoom.us/j/1',
        location: 'Zoom',
        url: 'https://zoom.us/j/1',
      },
    ],
    { name: 'Learn2Lead classes', now: new Date('2026-10-13T00:00:00Z') }
  );

  it('produces a valid calendar with UTC times and CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261015T211500Z');
    expect(ics).toContain('DTEND:20261015T221500Z');
    expect(ics).toContain('DTSTAMP:20261013T000000Z');
    expect(ics).toContain('UID:c1@learn2lead.page');
    expect(ics).toContain('SUMMARY:Mathematics with Ariana Rayi');
    expect(ics).toContain('X-WR-CALNAME:Learn2Lead classes');
    expect(ics.split('\r\n').every((l) => !l.includes('\n'))).toBe(true);
  });

  it('is still a valid calendar with no events', () => {
    const empty = buildIcsCalendar([], { name: 'x' });
    expect(empty).toContain('BEGIN:VCALENDAR');
    expect(empty).not.toContain('BEGIN:VEVENT');
  });
});
