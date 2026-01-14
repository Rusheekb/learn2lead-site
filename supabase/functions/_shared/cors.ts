/**
 * Shared CORS configuration for edge functions
 * 
 * Production domains should be explicitly listed for security.
 * In development, localhost and Lovable preview domains are also allowed.
 */

// Add your production domain(s) here
const ALLOWED_ORIGINS = [
  'https://learn2lead.lovable.app',  // Production domain
  'https://learn2lead-site.lovable.app', // Published Lovable domain
  'https://www.learn2lead.com',       // Custom domain (update when configured)
];

// Allow localhost in development
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

/**
 * Check if origin is a Lovable preview domain
 */
function isLovablePreviewOrigin(origin: string): boolean {
  return origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app');
}

/**
 * Get CORS headers with origin validation
 * Falls back to first allowed origin if request origin is not in whitelist
 */
export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const allAllowedOrigins = [...ALLOWED_ORIGINS, ...DEV_ORIGINS];
  
  // Determine allowed origin
  let origin: string;
  
  if (requestOrigin && allAllowedOrigins.includes(requestOrigin)) {
    // Exact match in allowed list
    origin = requestOrigin;
  } else if (requestOrigin && isLovablePreviewOrigin(requestOrigin)) {
    // Allow Lovable preview domains dynamically
    origin = requestOrigin;
  } else {
    // Fallback to first production domain
    origin = ALLOWED_ORIGINS[0];
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      status: 204 
    });
  }
  return null;
}
