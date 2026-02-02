/**
 * Image URL configuration utilities
 *
 * Provides functions to load and manage image base URL configuration from
 * environment variables or runtime configuration file. Supports both build-time
 * configuration (via Vite environment variables) and runtime configuration
 * (via JSON file in public directory).
 *
 * ## Configuration Precedence
 *
 * 1. Runtime config file: `/image-config.json` (highest priority)
 * 2. Environment variable: `VITE_IMAGE_BASE_URL`
 * 3. Default: `/images` (fallback)
 *
 * ## Usage
 *
 * ```typescript
 * import { getImageBaseUrl } from './utils/imageConfig';
 *
 * // Get the configured base URL (cached after first call)
 * const baseUrl = getImageBaseUrl();
 * // Returns: "/images" (default) or configured value
 * ```
 *
 * ## Configuration File Format
 *
 * Create `public/image-config.json`:
 * ```json
 * {
 *   "baseUrl": "https://cdn.example.com/gallery-images"
 * }
 * ```
 *
 * Or use environment variable:
 * ```bash
 * VITE_IMAGE_BASE_URL=https://cdn.example.com/gallery-images
 * ```
 */

/**
 * Image configuration interface
 *
 * Defines the structure of the image configuration JSON file.
 */
export interface ImageConfig {
  /** Base URL for full-size image files (absolute URL or relative path) */
  baseUrl: string;
  /** Base URL for thumbnail images. When set, thumbnails use this; when unset, use baseUrl */
  thumbnailBaseUrl?: string;
}

/**
 * Default base URL for images
 * Note: No trailing slash - trailing slashes are added during URL construction
 */
export const DEFAULT_BASE_URL = '/images';

/**
 * Cached configuration values
 * Loaded once and cached for application lifetime
 */
let cachedBaseUrl: string | null = null;
let cachedThumbnailBaseUrl: string | null = null;

/**
 * Configuration loading promise
 * Prevents multiple simultaneous loads
 */
let loadPromise: Promise<string> | null = null;

/**
 * Normalize image base URL
 *
 * Validates and normalizes the base URL by:
 * - Removing trailing slashes
 * - Validating basic URL format (absolute or relative path)
 * - Returning default on invalid input
 *
 * @param url - Base URL to normalize (can be absolute URL or relative path)
 * @returns Normalized base URL (no trailing slash) or default if invalid
 *
 * @example
 * ```typescript
 * normalizeImageBaseUrl('https://cdn.example.com/') // 'https://cdn.example.com'
 * normalizeImageBaseUrl('/gallery-images/') // '/gallery-images'
 * normalizeImageBaseUrl('') // '/images' (default)
 * normalizeImageBaseUrl(null) // '/images' (default)
 * ```
 */
export function normalizeImageBaseUrl(url: string | null | undefined): string {
  // Handle empty/null/undefined
  if (!url || typeof url !== 'string' || url.trim() === '') {
    if (import.meta.env.DEV && url !== undefined) {
      console.warn(
        '[imageConfig] Invalid base URL provided, using default:',
        url,
      );
    }
    return DEFAULT_BASE_URL;
  }

  const trimmed = url.trim();

  // Basic validation: should be absolute URL (http/https) or relative path starting with /
  const isAbsoluteUrl = /^https?:\/\//i.test(trimmed);
  const isRelativePath = trimmed.startsWith('/');

  if (!isAbsoluteUrl && !isRelativePath) {
    if (import.meta.env.DEV) {
      console.warn(
        '[imageConfig] Base URL must be absolute (http/https) or relative path (starting with /), using default:',
        trimmed,
      );
    }
    return DEFAULT_BASE_URL;
  }

  // Remove trailing slashes
  return trimmed.replace(/\/+$/, '');
}

/**
 * Validate image configuration structure
 *
 * Type guard to check if parsed JSON matches ImageConfig interface.
 *
 * @param data - Parsed JSON data to validate
 * @returns True if data matches ImageConfig structure
 */
function isValidImageConfig(data: unknown): data is ImageConfig {
  if (typeof data !== 'object' || data === null || !('baseUrl' in data)) {
    return false;
  }
  const c = data as ImageConfig;
  if (typeof c.baseUrl !== 'string') return false;
  if ('thumbnailBaseUrl' in c && c.thumbnailBaseUrl != null && typeof c.thumbnailBaseUrl !== 'string') {
    return false;
  }
  return true;
}

/**
 * In development, when VITE_IMAGE_PROXY_TARGET is set and baseUrl matches,
 * return same-origin proxy base so cross-origin image requests avoid
 * OpaqueResponseBlocking (CORS/CORP). Otherwise return baseUrl unchanged.
 */
function maybeProxyForDev(baseUrl: string): string {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return baseUrl;
  }
  const proxyTarget = import.meta.env.VITE_IMAGE_PROXY_TARGET;
  if (!proxyTarget || typeof proxyTarget !== 'string') {
    return baseUrl;
  }
  const target = proxyTarget.trim().replace(/\/+$/, '');
  if (target === '' || (!baseUrl.startsWith(target) && baseUrl !== target)) {
    return baseUrl;
  }
  return `${window.location.origin}/image-proxy`;
}

/**
 * Load image configuration
 *
 * Loads configuration from runtime config file or environment variable.
 * Configuration is loaded asynchronously and cached after first load.
 *
 * Priority:
 * 1. Runtime config file: `/image-config.json`
 * 2. Environment variable: `VITE_IMAGE_BASE_URL`
 * 3. Default: `/images`
 *
 * @returns Promise resolving to normalized base URL
 *
 * @example
 * ```typescript
 * const baseUrl = await loadImageConfig();
 * // Returns: "/images" or configured value
 * ```
 */
export async function loadImageConfig(): Promise<string> {
  // If already cached, return cached value
  if (cachedBaseUrl !== null) {
    return cachedBaseUrl;
  }

  // If load is in progress, return the existing promise
  if (loadPromise !== null) {
    return loadPromise;
  }

  // Start loading configuration
  loadPromise = (async () => {
    try {
      // Try loading runtime config file first
      try {
        const response = await fetch('/image-config.json');

        if (response.ok) {
          let jsonData: unknown;
          try {
            jsonData = await response.json();
          } catch (error) {
            // JSON parse error - fall through to env/default
            if (import.meta.env.DEV) {
              console.warn(
                '[imageConfig] Failed to parse image-config.json, falling back to environment variable or default:',
                error,
              );
            }
          }

          // Validate and use runtime config
          if (jsonData !== undefined && isValidImageConfig(jsonData)) {
            const normalized = normalizeImageBaseUrl(jsonData.baseUrl);
            const baseUrl = maybeProxyForDev(normalized);
            cachedBaseUrl = baseUrl;
            const thumbUrl = jsonData.thumbnailBaseUrl
              ? maybeProxyForDev(normalizeImageBaseUrl(jsonData.thumbnailBaseUrl))
              : baseUrl;
            cachedThumbnailBaseUrl = thumbUrl;
            return baseUrl;
          } else if (jsonData !== undefined) {
            // Invalid schema - fall through to env/default
            if (import.meta.env.DEV) {
              console.warn(
                '[imageConfig] Invalid image-config.json structure (missing baseUrl field), falling back to environment variable or default',
              );
            }
          }
        }
        // 404 is not an error - fall through to env/default
      } catch (error) {
        // Network error - fall through to env/default
        if (import.meta.env.DEV) {
          console.warn(
            '[imageConfig] Failed to load image-config.json, falling back to environment variable or default:',
            error,
          );
        }
      }

      // Try environment variable
      const envBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;
      const envThumbUrl = import.meta.env.VITE_IMAGE_THUMBNAIL_BASE_URL;
      if (envBaseUrl && typeof envBaseUrl === 'string') {
        const normalized = normalizeImageBaseUrl(envBaseUrl);
        const baseUrl = maybeProxyForDev(normalized);
        cachedBaseUrl = baseUrl;
        cachedThumbnailBaseUrl = envThumbUrl && typeof envThumbUrl === 'string'
          ? maybeProxyForDev(normalizeImageBaseUrl(envThumbUrl))
          : baseUrl;
        return baseUrl;
      }

      // Use default
      cachedBaseUrl = DEFAULT_BASE_URL;
      cachedThumbnailBaseUrl = DEFAULT_BASE_URL;
      return DEFAULT_BASE_URL;
    } finally {
      // Clear load promise after completion
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Get image base URL
 *
 * Returns the configured base URL for image files. Configuration is loaded
 * once and cached for subsequent calls. This function is synchronous and
 * returns the cached value, or triggers initial load if not yet loaded.
 *
 * For synchronous access, the function will return the default value on
 * first call if configuration hasn't loaded yet. The configuration will
 * be loaded asynchronously in the background.
 *
 * @returns Base URL for images (normalized, no trailing slash)
 *
 * @example
 * ```typescript
 * const baseUrl = getImageBaseUrl();
 * // Returns: "/images" (default) or configured value
 * ```
 */
export function getImageBaseUrl(): string {
  // If cached, return immediately
  if (cachedBaseUrl !== null) {
    return cachedBaseUrl;
  }

  // Trigger async load (don't await - return default for now)
  // Configuration will be cached after load completes
  loadImageConfig().catch((error) => {
    // Should not happen due to error handling, but log if it does
    if (import.meta.env.DEV) {
      console.error('[imageConfig] Unexpected error loading configuration:', error);
    }
  });

  // Return default until configuration loads
  return DEFAULT_BASE_URL;
}

/**
 * Get thumbnail base URL.
 * Returns thumbnailBaseUrl when configured, otherwise baseUrl.
 */
export function getThumbnailBaseUrl(): string {
  if (cachedThumbnailBaseUrl !== null) {
    return cachedThumbnailBaseUrl;
  }
  return getImageBaseUrl();
}

/**
 * Clear image configuration cache
 *
 * Clears the cached configuration value. Useful for testing.
 * After clearing, the next call to `getImageBaseUrl()` will trigger
 * a new configuration load.
 *
 * @example
 * ```typescript
 * clearImageConfigCache();
 * const baseUrl = getImageBaseUrl(); // Will reload configuration
 * ```
 */
export function clearImageConfigCache(): void {
  cachedBaseUrl = null;
  cachedThumbnailBaseUrl = null;
  loadPromise = null;
}

// Initialize configuration on module load
// This ensures configuration is loaded early in application lifecycle
loadImageConfig().catch((error) => {
  // Should not happen due to error handling, but log if it does
  if (import.meta.env.DEV) {
    console.error('[imageConfig] Unexpected error during initial configuration load:', error);
  }
});
