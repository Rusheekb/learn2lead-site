/**
 * The one place class times are converted between time zones.
 *
 * Each class is stored as an exact moment (scheduled_classes.start_at /
 * end_at, class_logs.start_at) plus the zone it was scheduled in. Screens
 * show it in the *viewer's* zone: their saved profiles.timezone, else their
 * device's zone, else Central. The legacy date/start_time/end_time columns
 * always hold Central clock time (kept in sync by a database trigger) and are
 * only used as a fallback for rows that predate start_at.
 */
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/** The business's home zone, and the fallback when nothing else is known. */
export const BUSINESS_TIMEZONE = 'America/Chicago';

/** Zones shown first in the time zone picker. */
export const COMMON_TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Phoenix', label: 'Arizona (no daylight saving)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
];

export function isValidTimezone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The zone this device reports, or null if unavailable/invalid. */
export function getDeviceTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimezone(tz) ? tz : null;
  } catch {
    return null;
  }
}

/** Every zone the browser knows, for the "other" section of the picker. */
export function allTimezones(): string[] {
  const intl = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };
  try {
    const zones = intl.supportedValuesOf?.('timeZone');
    if (zones && zones.length) return zones;
  } catch {
    // fall through
  }
  return COMMON_TIMEZONES.map((z) => z.value);
}

// The viewer's zone is module state rather than React context because the
// row → class mappers that use it are plain functions called from query
// functions. useTimezoneSync sets it from the profile after sign-in.
let viewerTimezone: string | null = null;

export function setViewerTimezone(tz: string | null): void {
  viewerTimezone = isValidTimezone(tz) ? tz : null;
}

export function getViewerTimezone(): string {
  return viewerTimezone ?? getDeviceTimezone() ?? BUSINESS_TIMEZONE;
}

const toDate = (instant: string | Date): Date =>
  instant instanceof Date ? instant : new Date(instant);

/**
 * The exact moment for a clock time in a given zone, e.g.
 * ('2026-10-15', '16:15', 'America/Chicago') → 2026-10-15T21:15:00Z.
 */
export function zonedToInstant(
  date: string | Date,
  time: string,
  tz: string
): Date {
  const day =
    date instanceof Date ? formatLocalDate(date) : String(date).slice(0, 10);
  const hhmm = time.length >= 5 ? time.slice(0, 5) : time;
  return fromZonedTime(`${day}T${hhmm}:00`, tz);
}

/** Calendar date (yyyy-MM-dd) and clock time (HH:mm) of a moment in a zone. */
export function instantToZonedParts(
  instant: string | Date,
  tz: string
): { date: string; time: string } {
  const d = toDate(instant);
  return {
    date: formatInTimeZone(d, tz, 'yyyy-MM-dd'),
    time: formatInTimeZone(d, tz, 'HH:mm'),
  };
}

/** Short zone label for a moment, e.g. "CDT", "PST" (DST-correct). */
export function zoneAbbreviation(instant: string | Date, tz: string): string {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'short',
  })
    .formatToParts(toDate(instant))
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? tz;
}

/** "4:15 PM" in the given zone. */
export function formatTime12(instant: string | Date, tz: string): string {
  return formatInTimeZone(toDate(instant), tz, 'h:mm a');
}

/** "4:15 PM CDT" in the given zone. */
export function formatTimeWithZone(instant: string | Date, tz: string): string {
  return `${formatTime12(instant, tz)} ${zoneAbbreviation(instant, tz)}`;
}

/** Whether two zones show a different clock time for this moment. */
export function zonesDiffer(
  instant: string | Date,
  a: string,
  b: string
): boolean {
  const pa = instantToZonedParts(instant, a);
  const pb = instantToZonedParts(instant, b);
  return pa.date !== pb.date || pa.time !== pb.time;
}

/** Human-friendly name for a zone, e.g. "Pacific Time". */
export function timezoneLabel(tz: string): string {
  const common = COMMON_TIMEZONES.find((z) => z.value === tz);
  if (common) return common.label;
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'long',
    })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName');
    return part ? `${part.value} (${tz})` : tz;
  } catch {
    return tz;
  }
}

export interface ClassTimeRow {
  start_at?: string | null;
  end_at?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

export interface ViewerClassTimes {
  /** yyyy-MM-dd in the viewer's zone */
  date: string;
  /** HH:mm in the viewer's zone */
  startTime: string;
  /** HH:mm in the viewer's zone ('' if unknown) */
  endTime: string;
  /** exact start, ISO */
  startAt: string | null;
  /** exact end, ISO */
  endAt: string | null;
  /** e.g. "CDT" */
  tzAbbr: string;
  /** the zone these fields are expressed in */
  viewerTimezone: string;
}

/**
 * A class's date and times as the viewer should see them. Uses the exact
 * start/end when present; otherwise treats the legacy columns as Central
 * clock time (what they've always meant).
 */
export function classTimesForViewer(
  row: ClassTimeRow,
  viewerTz: string = getViewerTimezone()
): ViewerClassTimes {
  let startAt: Date | null = row.start_at ? new Date(row.start_at) : null;
  let endAt: Date | null = row.end_at ? new Date(row.end_at) : null;

  if (!startAt && row.date && row.start_time) {
    startAt = zonedToInstant(row.date, row.start_time, BUSINESS_TIMEZONE);
  }
  if (!endAt && row.date && row.end_time) {
    endAt = zonedToInstant(row.date, row.end_time, BUSINESS_TIMEZONE);
    if (startAt && endAt <= startAt) {
      endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  if (!startAt || Number.isNaN(startAt.getTime())) {
    return {
      date: row.date ?? '',
      startTime: row.start_time?.slice(0, 5) ?? '',
      endTime: row.end_time?.slice(0, 5) ?? '',
      startAt: null,
      endAt: null,
      tzAbbr: '',
      viewerTimezone: viewerTz,
    };
  }

  const start = instantToZonedParts(startAt, viewerTz);
  const end =
    endAt && !Number.isNaN(endAt.getTime())
      ? instantToZonedParts(endAt, viewerTz)
      : null;

  return {
    date: start.date,
    startTime: start.time,
    endTime: end?.time ?? '',
    startAt: startAt.toISOString(),
    endAt: endAt && end ? endAt.toISOString() : null,
    tzAbbr: zoneAbbreviation(startAt, viewerTz),
    viewerTimezone: viewerTz,
  };
}

/**
 * Exact start/end for a class entered as a date plus clock times in `tz`
 * (the scheduler's zone). An end time at or before the start is treated as
 * the next day.
 */
export function classInstantsFromInput(
  date: string | Date,
  startTime: string,
  endTime: string,
  tz: string
): { start_at: string; end_at: string } {
  const start = zonedToInstant(date, startTime, tz);
  let end = zonedToInstant(date, endTime, tz);
  if (end <= start) {
    const day =
      date instanceof Date ? formatLocalDate(date) : String(date).slice(0, 10);
    const [y, m, d] = day.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    end = zonedToInstant(next.toISOString().slice(0, 10), endTime, tz);
  }
  return { start_at: start.toISOString(), end_at: end.toISOString() };
}

/** yyyy-MM-dd of a Date using its local calendar fields (no UTC shift). */
function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
