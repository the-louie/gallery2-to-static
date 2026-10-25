/// <reference types="vite/client" />

// Build-time settings (all optional): Sentry error reporting stays off without a DSN (SENTRY-01)
interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_RELEASE?: string;
}
