/**
 * Students a parent adds have a placeholder sign-in address (no login, never
 * emailed). Mirrors MANAGED_EMAIL_DOMAIN in
 * supabase/functions/_shared/recipients.ts — a test keeps the two in step.
 */
export const MANAGED_EMAIL_DOMAIN = 'managed.learn2lead.page';

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return (
    !!email && email.trim().toLowerCase().endsWith(`@${MANAGED_EMAIL_DOMAIN}`)
  );
}

/** An address fit to show a person: placeholders read as a plain label. */
export function displayEmail(
  email: string | null | undefined,
  placeholderLabel = 'No email (added by parent)'
): string {
  return isPlaceholderEmail(email) ? placeholderLabel : (email ?? '');
}
