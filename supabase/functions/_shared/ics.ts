/**
 * Builds an iCalendar (RFC 5545) feed. Pure — no Deno/npm imports — so it
 * runs in the calendar-feed edge function and is unit-tested with Jest.
 * Times are always exact UTC moments ("…Z"), so every calendar app shows
 * each class at the right local time for whoever subscribed.
 */

export interface IcsEvent {
  id: string;
  title: string;
  startAt: string; // ISO
  endAt: string; // ISO
  description?: string;
  location?: string;
  url?: string;
}

/** 2026-10-15T21:15:00.000Z → 20261015T211500Z */
export function toIcsUtc(instant: string | Date): string {
  return new Date(instant)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** Escape text values per RFC 5545 §3.3.11. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** UTF-8 byte length (no TextEncoder, so it also runs under jsdom). */
function utf8Length(s: string): number {
  let n = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    n += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return n;
}

/**
 * Fold lines longer than 75 octets (RFC 5545 §3.1): continuation lines start
 * with a single space. Counts UTF-8 bytes so multi-byte names don't break.
 */
export function foldIcsLine(line: string): string {
  if (utf8Length(line) <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let limit = 75;
  for (const ch of line) {
    if (utf8Length(current + ch) > limit) {
      parts.push(current);
      current = ch;
      limit = 74; // continuation lines lose one octet to the leading space
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts.join('\r\n ');
}

export function buildIcsCalendar(
  events: IcsEvent[],
  options: { name: string; now?: Date } = { name: 'Learn2Lead' }
): string {
  const stamp = toIcsUtc(options.now ?? new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Learn2Lead//Tutoring Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(options.name)}`,
    // Hints for how often subscribed calendars should refresh.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];

  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@learn2lead.page`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsUtc(e.startAt)}`,
      `DTEND:${toIcsUtc(e.endAt)}`,
      `SUMMARY:${escapeIcsText(e.title)}`
    );
    if (e.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(e.description)}`);
    }
    if (e.location) lines.push(`LOCATION:${escapeIcsText(e.location)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}
