/**
 * Shared CORS configuration for edge functions
 *
 * Production domains should be explicitly listed for security.
 * In development, localhost origins are also allowed.
 */

const ALLOWED_ORIGINS = [
  'https://learn2lead.page',
  'https://www.learn2lead.page',
];

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

/**
 * Get CORS headers with origin validation
 * Falls back to first allowed origin if request origin is not in whitelist
 */
export function getCorsHeaders(
  requestOrigin?: string | null
): Record<string, string> {
  const allAllowedOrigins = [...ALLOWED_ORIGINS, ...DEV_ORIGINS];

  const origin =
    requestOrigin && allAllowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    return new Response(null, {
      headers: getCorsHeaders(origin),
      status: 204,
    });
  }
  return null;
}
