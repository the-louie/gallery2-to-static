/**
 * Error reporting to Sentry (SENTRY-01).
 *
 * Off unless the build sets VITE_SENTRY_DSN: then the SDK is loaded as its own chunk after start
 * (nothing extra in the initial load) and sends errors only: no user fields, cookies, headers,
 * bodies or query strings, no performance tracing, no session replay. Errors reported before the SDK is ready are
 * kept (up to MAX_PENDING) and sent once it is.
 */

export interface ErrorReportingEnv {
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_ENVIRONMENT?: string;
  VITE_SENTRY_RELEASE?: string;
  MODE?: string;
}

type Reporter = (error: unknown, extra?: Record<string, unknown>) => void;

const MAX_PENDING = 20;
let reporter: Reporter | null = null;
let pending: Array<[unknown, Record<string, unknown> | undefined]> = [];

/** Report an error (no-op while reporting is off; queued until the SDK has loaded). */
export function reportError(error: unknown, extra?: Record<string, unknown>): void {
  if (reporter) reporter(error, extra);
  else if (pending.length < MAX_PENDING) pending.push([error, extra]);
}

/** Start reporting if a DSN is configured. Resolves true when Sentry was initialised. */
export async function initErrorReporting(env: ErrorReportingEnv = import.meta.env): Promise<boolean> {
  const dsn = env.VITE_SENTRY_DSN?.trim();
  if (!dsn) {
    pending = [];
    return false;
  }
  const Sentry = await import('./sentryClient');
  Sentry.init({
    dsn,
    environment: env.VITE_SENTRY_ENVIRONMENT || env.MODE || 'production',
    release: env.VITE_SENTRY_RELEASE || undefined,
    // Sentry 11: no user fields, cookies, headers, bodies or query strings (search terms) in events
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    tracesSampleRate: 0,
  });
  reporter = (error, extra) => {
    Sentry.captureException(error, extra ? { extra } : undefined);
  };
  const queued = pending;
  pending = [];
  for (const [error, extra] of queued) reporter(error, extra);
  return true;
}

/** Test helper: back to the initial state. */
export function resetErrorReportingForTests(): void {
  reporter = null;
  pending = [];
}
