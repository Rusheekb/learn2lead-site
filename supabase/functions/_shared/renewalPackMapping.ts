/**
 * renewal_pack ('basic'|'standard'|'premium') is the same key
 * AutoRenewalSettings.tsx / src/config/stripe.ts use everywhere else, where
 * it maps to an hour count (4/8/12), not a subscription_plans.name. A past
 * bug in process-auto-renewal matched against plan NAME strings ('Basic
 * Plan', etc.) that have never existed in subscription_plans (real rows are
 * named e.g. "4 Credit Pack") — every auto-renewal attempt failed silently
 * since the feature's inception. Matching by classes_per_month instead,
 * which is stable regardless of how a plan happens to be named.
 */
const PACK_TO_CLASSES_PER_MONTH: Record<string, number> = {
  basic: 4,
  standard: 8,
  premium: 12,
};

const FALLBACK_CLASSES_PER_MONTH = 8;

export function resolveClassesPerMonth(renewalPack: string): number {
  return PACK_TO_CLASSES_PER_MONTH[renewalPack] ?? FALLBACK_CLASSES_PER_MONTH;
}

const CLASSES_PER_MONTH_TO_PACK: Record<number, string> = {
  4: 'basic',
  8: 'standard',
  12: 'premium',
};

const FALLBACK_PACK = 'standard';

/** Inverse of resolveClassesPerMonth — used to default a checkout purchase's
 * tier into an auto_renewal_settings.renewal_pack value when a student opts
 * into auto-renewal at checkout. */
export function resolvePackFromClassesPerMonth(
  classesPerMonth: number
): string {
  return CLASSES_PER_MONTH_TO_PACK[classesPerMonth] ?? FALLBACK_PACK;
}
