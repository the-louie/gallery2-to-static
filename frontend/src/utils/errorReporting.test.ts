/**
 * errorReporting (SENTRY-01): off without a DSN, privacy settings, queue until the SDK is loaded.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const init = vi.fn();
const captureException = vi.fn();
vi.mock('./sentryClient', () => ({ init: (o: unknown) => init(o), captureException: (e: unknown, c: unknown) => captureException(e, c) }));

import { initErrorReporting, reportError, resetErrorReportingForTests } from './errorReporting';

describe('errorReporting', () => {
  beforeEach(() => {
    init.mockReset();
    captureException.mockReset();
    resetErrorReportingForTests();
  });

  it('stays off without a DSN and drops queued errors', async () => {
    reportError(new Error('early'));
    expect(await initErrorReporting({ VITE_SENTRY_DSN: '  ' })).toBe(false);
    expect(init).not.toHaveBeenCalled();
    reportError(new Error('later'));
    expect(captureException).not.toHaveBeenCalled();
  });

  it('initialises Sentry with errors only and no personal data', async () => {
    expect(await initErrorReporting({ VITE_SENTRY_DSN: 'https://k@o1.ingest.de.sentry.io/1', MODE: 'production', VITE_SENTRY_RELEASE: 'abc123' })).toBe(true);
    const opts = init.mock.calls[0][0];
    expect(opts).toMatchObject({
      dsn: 'https://k@o1.ingest.de.sentry.io/1',
      environment: 'production',
      release: 'abc123',
      tracesSampleRate: 0,
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    });
    expect(opts.replaysSessionSampleRate).toBeUndefined();
    expect(opts.integrations).toBeUndefined();
  });

  it('sends errors reported before the SDK was ready, then reports directly', async () => {
    const early = new Error('early');
    reportError(early, { componentStack: 'at X' });
    await initErrorReporting({ VITE_SENTRY_DSN: 'https://k@o1.ingest.de.sentry.io/1' });
    expect(captureException).toHaveBeenCalledWith(early, { extra: { componentStack: 'at X' } });
    const late = new Error('late');
    reportError(late);
    expect(captureException).toHaveBeenLastCalledWith(late, undefined);
  });

  it('keeps at most 20 early errors', async () => {
    for (let i = 0; i < 25; i++) reportError(new Error(`e${i}`));
    await initErrorReporting({ VITE_SENTRY_DSN: 'https://k@o1.ingest.de.sentry.io/1' });
    expect(captureException).toHaveBeenCalledTimes(20);
  });
});
