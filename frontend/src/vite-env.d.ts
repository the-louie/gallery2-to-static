/// <reference types="vite/client" />

// Build-time settings (all optional): Sentry error reporting stays off without a DSN (SENTRY-01)
interface ImportMetaEnv {
  /** index.html <title> and the fallback site name (default "Gallery", .env) */
  readonly VITE_SITE_NAME?: string;
  readonly VITE_META_DESCRIPTION?: string;
  readonly VITE_META_KEYWORDS?: string;
  /** Banner above the nav bar in the classic theme (BANNER-01); shown only when src and href are set */
  readonly VITE_BANNER_SRC?: string;
  readonly VITE_BANNER_SRC_2X?: string;
  readonly VITE_BANNER_SRC_SMALL?: string;
  readonly VITE_BANNER_SRC_SMALL_2X?: string;
  readonly VITE_BANNER_HREF?: string;
  readonly VITE_BANNER_ALT?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_RELEASE?: string;
}
