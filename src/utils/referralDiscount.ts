export type DiscountType = 'fixed' | 'percent';

export function formatReferralDiscount(
  amount: number,
  type: DiscountType
): string {
  return type === 'percent' ? `${amount}%` : `$${amount}`;
}
