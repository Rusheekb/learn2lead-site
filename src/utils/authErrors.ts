import { validationMessages } from '@/lib/validation';

/**
 * Supabase Auth's own error text is written for developers ("Password should
 * contain at least one character of each: abcdefghijklmnopqrstuvwxyzABCD…").
 * Turn the ones people actually hit into plain language; anything else passes
 * through unchanged.
 */
export function friendlyAuthError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error ?? '');
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  if (
    code === 'weak_password' ||
    /password should (contain|be at least)/i.test(raw)
  ) {
    return validationMessages.password;
  }
  if (
    code === 'user_already_exists' ||
    /already (registered|been registered)/i.test(raw)
  ) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (/invalid login credentials/i.test(raw)) {
    return 'That email and password don’t match. Please try again.';
  }
  if (
    code === 'same_password' ||
    /should be different from the old/i.test(raw)
  ) {
    return 'Choose a password you haven’t used before.';
  }
  return raw || 'Something went wrong. Please try again.';
}
