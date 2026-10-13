/**
 * The one way the app writes an amount of tutoring time: "1 hour",
 * "1.5 hours", "0.5 hours". Balances, packs and class lengths are all hours
 * (internally some code and columns still say "credits"; 1 credit = 1 hour).
 * Identical copy of src/lib/hours.ts for the edge functions (Deno can't
 * import app code) — keep the two in sync.
 */
export function formatHours(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  const rounded = Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  return `${rounded} ${Math.abs(rounded) === 1 ? 'hour' : 'hours'}`;
}
