/**
 * Report an edge-function failure to Sentry: the same project as the
 * website, tagged runtime=edge-function. That way a failure in billing,
 * reminders or messaging raises an alert instead of sitting in the logs.
 *
 * Does nothing unless the SENTRY_DSN secret is set (it is the website's
 * public DSN). Never throws, and gives up after 2 seconds so it can't hold
 * up a response. Keep personal data out of `extra`: ids are fine, names and
 * email addresses aren't.
 *
 * No imports, so Jest can test it alongside the other _shared helpers.
 */

export interface ParsedDsn {
  protocol: string;
  publicKey: string;
  host: string;
  projectId: string;
}

export type ErrorExtra = Record<string, string | number | boolean | null>;

/** https://<key>@<host>/<project id> → its parts, or null if malformed. */
export function parseDsn(dsn: string | undefined | null): ParsedDsn | null {
  if (!dsn) return null;
  const match = /^(https?):\/\/([^@/]+)@([^/]+)\/(\d+)\/?$/.exec(dsn.trim());
  if (!match) return null;
  const [, protocol, publicKey, host, projectId] = match;
  return { protocol, publicKey, host, projectId };
}

export function envelopeUrl(dsn: ParsedDsn): string {
  const params = new URLSearchParams({
    sentry_key: dsn.publicKey,
    sentry_version: '7',
    sentry_client: 'learn2lead-edge/1.0',
  });
  return `${dsn.protocol}://${dsn.host}/api/${dsn.projectId}/envelope/?${params}`;
}

/** The Sentry envelope (3 JSON lines) for one error event. */
export function buildEnvelope(args: {
  functionName: string;
  error: unknown;
  extra?: ErrorExtra;
  eventId: string;
  now: Date;
  environment: string;
}): string {
  const err =
    args.error instanceof Error ? args.error : new Error(String(args.error));
  const event = {
    event_id: args.eventId,
    timestamp: args.now.getTime() / 1000,
    platform: 'javascript',
    level: 'error',
    environment: args.environment,
    server_name: args.functionName,
    transaction: args.functionName,
    tags: { runtime: 'edge-function', function: args.functionName },
    exception: {
      values: [{ type: err.name || 'Error', value: err.message }],
    },
    extra: { ...(args.extra ?? {}), stack: err.stack ?? null },
  };
  return [
    JSON.stringify({ event_id: args.eventId, sent_at: args.now.toISOString() }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(event),
  ].join('\n');
}

type EnvReader = { env: { get(key: string): string | undefined } };

export async function reportError(
  functionName: string,
  error: unknown,
  extra?: ErrorExtra,
  deps: {
    dsn?: string | null;
    environment?: string;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<void> {
  try {
    const deno = (globalThis as { Deno?: EnvReader }).Deno;
    const dsn = parseDsn(deps.dsn ?? deno?.env.get('SENTRY_DSN'));
    if (!dsn) return;
    const eventId = crypto.randomUUID().replace(/-/g, '');
    const body = buildEnvelope({
      functionName,
      error,
      extra,
      eventId,
      now: new Date(),
      environment:
        deps.environment ?? deno?.env.get('SENTRY_ENVIRONMENT') ?? 'production',
    });
    const doFetch = deps.fetchImpl ?? fetch;
    await doFetch(envelopeUrl(dsn), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body,
      // Deno has AbortSignal.timeout; guard so the helper also runs in tests.
      signal:
        typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(2000)
          : undefined,
    });
  } catch {
    // Reporting must never break the function it's reporting on.
  }
}
