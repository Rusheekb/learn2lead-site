import { logger } from '@/lib/logger';
import { classInstantsFromInput, getViewerTimezone } from '@/lib/time';

const log = logger.create('calendarUtils');

// Utility functions for calendar integration

interface CalendarEventInput {
  title: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  /** Exact start (ISO). Preferred: correct in every time zone. */
  startAt?: string | null;
  /** Exact end (ISO). */
  endAt?: string | null;
  zoomLink?: string | null;
  notes?: string | null;
}

/**
 * Safely parse HH:mm time string and return hours and minutes
 */
const parseHHMM = (
  timeStr: string
): { hours: number; minutes: number } | null => {
  if (!timeStr || typeof timeStr !== 'string') {
    log.warn('Invalid time string', { timeStr });
    return null;
  }

  const parts = timeStr.split(':');
  if (parts.length !== 2) {
    log.warn('Time string not in HH:mm format', { timeStr });
    return null;
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (
    isNaN(hours) ||
    isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    log.warn('Invalid time values', { hours, minutes });
    return null;
  }

  return { hours, minutes };
};

const localYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * The event's exact start and end. Calendar exports used to send a "floating"
 * local time with no zone, so a calendar app read it in the *user's* zone —
 * a 4:15 PM Central class landed at 4:15 PM Pacific for a Pacific user. We now
 * always export exact UTC moments, which every calendar app converts to the
 * user's own time. Uses startAt/endAt when present; otherwise the date and
 * HH:mm fields, which are in the viewer's time zone.
 */
export const resolveEventRange = (
  event: CalendarEventInput
): { start: Date; end: Date } | null => {
  if (event.startAt && event.endAt) {
    const start = new Date(event.startAt);
    const end = new Date(event.endAt);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return { start, end };
    }
  }

  if (!parseHHMM(event.startTime) || !parseHHMM(event.endTime)) return null;
  const day =
    event.date instanceof Date
      ? localYmd(event.date)
      : String(event.date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;

  const { start_at, end_at } = classInstantsFromInput(
    day,
    event.startTime,
    event.endTime,
    getViewerTimezone()
  );
  return { start: new Date(start_at), end: new Date(end_at) };
};

/** 2026-10-15T21:15:00.000Z → 20261015T211500Z (iCalendar / Google UTC form) */
const toUtcBasic = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

const describe = (event: CalendarEventInput) => {
  let description = event.notes || '';
  if (event.zoomLink) {
    description += `\n\nJoin Zoom Meeting: ${event.zoomLink}`;
  }
  return description;
};

/**
 * Returns the calendar feed URL for a given user
 */
export const getUserCalendarFeedUrl = async (
  userId: string
): Promise<string> => {
  try {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/calendar/ics/${userId}`;
  } catch (error) {
    log.error('Error getting calendar feed URL', error);
    return '';
  }
};

/**
 * Creates a Google Calendar event URL
 */
export const createGoogleCalendarUrl = (event: CalendarEventInput): string => {
  try {
    const range = resolveEventRange(event);
    if (!range) {
      log.warn('Invalid start or end time for calendar URL');
      return '#';
    }

    const url = new URL('https://www.google.com/calendar/event');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', event.title);
    url.searchParams.append(
      'dates',
      `${toUtcBasic(range.start)}/${toUtcBasic(range.end)}`
    );
    url.searchParams.append('details', describe(event));
    if (event.zoomLink) {
      url.searchParams.append('location', 'Zoom Meeting');
    }

    return url.toString();
  } catch (error) {
    log.warn('Error creating Google Calendar URL', { error });
    return '#';
  }
};

/**
 * Creates an Outlook Calendar event URL
 */
export const createOutlookCalendarUrl = (event: CalendarEventInput): string => {
  try {
    const range = resolveEventRange(event);
    if (!range) {
      log.warn('Invalid start or end time for calendar URL');
      return '#';
    }

    const url = new URL(
      'https://outlook.office.com/calendar/0/deeplink/compose'
    );
    url.searchParams.append('subject', event.title);
    url.searchParams.append('startdt', range.start.toISOString());
    url.searchParams.append('enddt', range.end.toISOString());
    url.searchParams.append('body', describe(event));
    if (event.zoomLink) {
      url.searchParams.append('location', 'Zoom Meeting');
    }

    return url.toString();
  } catch (error) {
    log.warn('Error creating Outlook Calendar URL', { error });
    return '#';
  }
};

/**
 * Builds the text of an .ics file for one event (UTC times).
 */
export const buildIcsContent = (
  event: CalendarEventInput & { id: string }
): string | null => {
  const range = resolveEventRange(event);
  if (!range) return null;

  const escapeIcs = (str: string) =>
    str.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Learn2Lead//Tutoring Platform//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@learn2lead.page`,
    `DTSTAMP:${toUtcBasic(new Date())}`,
    `DTSTART:${toUtcBasic(range.start)}`,
    `DTEND:${toUtcBasic(range.end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.notes || '')}${event.zoomLink ? '\\n\\nJoin Zoom Meeting: ' + escapeIcs(event.zoomLink) : ''}`,
    event.zoomLink ? `LOCATION:Zoom Meeting` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
};

/**
 * Creates a download URL for an ICS file
 */
export const createIcsDownloadUrl = (
  event: CalendarEventInput & { id: string }
): string => {
  try {
    const icsContent = buildIcsContent(event);
    if (!icsContent) {
      log.warn('Invalid start or end time for ICS file');
      return '#';
    }

    const blob = new Blob([icsContent], {
      type: 'text/calendar;charset=utf-8',
    });
    return URL.createObjectURL(blob);
  } catch (error) {
    log.warn('Error creating ICS download URL', { error });
    return '#';
  }
};
