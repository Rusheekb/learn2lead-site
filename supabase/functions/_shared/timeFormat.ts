/**
 * Time-zone-aware formatting for emails. Each class is stored as an exact
 * moment (start_at); emails show it in the recipient's own time zone
 * (profiles.timezone), falling back to Central. Pure Intl — no Deno or npm
 * imports — so it runs in edge functions and is unit-tested with Jest.
 */

export const BUSINESS_TIMEZONE = 'America/Chicago';

/** The recipient's zone if it's a valid IANA name, else Central. */
export function safeZone(tz: string | null | undefined): string {
  if (!tz) return BUSINESS_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return BUSINESS_TIMEZONE;
  }
}

/** "4:15 PM CDT" — DST-correct abbreviation for that date. */
export function formatTimeInZone(instant: string | Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: safeZone(tz),
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(instant));
}

/** "Thursday, October 15" in the given zone. */
export function formatDateInZone(
  instant: string | Date,
  tz: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }
): string {
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: safeZone(tz),
  }).format(new Date(instant));
}
