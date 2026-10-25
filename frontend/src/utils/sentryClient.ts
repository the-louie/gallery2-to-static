// The two Sentry functions error reporting uses, re-exported so the dynamic import can tree-shake
// the rest of the SDK (a namespace import of '@sentry/react' kept all of it: 450 KB; SENTRY-01).
export { init, captureException } from '@sentry/react';
