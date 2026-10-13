/**
 * The one way the app writes an amount of tutoring time: "1 hour",
 * "1.5 hours", "0.5 hours". Balances, packs and class lengths are all hours
 * (internally some code and columns still say "credits"; 1 credit = 1 hour).
 * The email functions use an identical copy in
 * supabase/functions/_shared/hours.ts.
 */
export function formatHours(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  const rounded = Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  return `${rounded} ${Math.abs(rounded) === 1 ? 'hour' : 'hours'}`;
}

/**
 * Show an hours-history entry in current wording. Older entries were written
 * as "Credit pack purchase - 12 Credit Pack" etc.; rather than rewrite those
 * records, they're translated for display. New entries already use the new
 * wording, which passes through unchanged.
 */
export function describeHoursActivity(
  reason: string | null | undefined
): string {
  return (reason ?? '')
    .replace(/^(initial )?credit pack purchase - /i, 'Purchased ')
    .replace(/(\d+)\s+Credit Pack/g, '$1-Hour Pack')
    .replace(/^credit restored/i, 'Hours restored')
    .replace(/\bcredit pack\b/gi, 'hour pack');
}
