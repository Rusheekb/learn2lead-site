/**
 * Shared-secret check for functions triggered by pg_cron.
 *
 * These functions run with verify_jwt = false (a cron job has no user), so
 * without this anyone who knew the URL could trigger emails to every family.
 * The cron jobs send the secret in an `x-cron-secret` header, read at run
 * time from Supabase Vault (secret name `cron_secret`); the functions compare
 * it against the CRON_SECRET edge-function secret. The value lives only in
 * those two places — never in the repo.
 */

export const CRON_SECRET_HEADER = 'x-cron-secret';

/**
 * Constant-time comparison so response timing can't leak how much of a
 * guessed secret was right. Fails closed when the expected secret isn't
 * configured, rather than letting every request through.
 */
export function safeEqual(
  provided: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!expected || !provided) return false;
  if (provided.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export const isValidCronSecret = safeEqual;

/**
 * Returns a 401 Response when the request lacks the valid cron secret, or
 * null when it's authorized and the function should proceed.
 */
export function requireCronSecret(
  req: Request,
  corsHeaders: Record<string, string>,
  expected: string | undefined
): Response | null {
  if (isValidCronSecret(req.headers.get(CRON_SECRET_HEADER), expected)) {
    return null;
  }
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
