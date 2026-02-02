/**
 * Image URL configuration utilities
 *
 * Local-only model: all images load from frontend/public/g2data (symlink).
 * Full-size images: /g2data/albums/...
 * Thumbnails: /g2data/thumbnails/...
 *
 * @module frontend/src/utils/imageConfig
 */

/** Base URL for full-size images (no trailing slash) */
export const IMAGE_BASE_URL = '/g2data/albums';

/** Base URL for thumbnail images (no trailing slash) */
export const THUMBNAIL_BASE_URL = '/g2data/thumbnails';

/**
 * Default base URL for images (alias for IMAGE_BASE_URL).
 * Kept for backward compatibility with existing call sites.
 */
export const DEFAULT_BASE_URL = IMAGE_BASE_URL;

/**
 * Get image base URL.
 *
 * @returns Base URL for full-size images
 */
export function getImageBaseUrl(): string {
  return IMAGE_BASE_URL;
}

/**
 * Get thumbnail base URL.
 *
 * @returns Base URL for thumbnail images
 */
export function getThumbnailBaseUrl(): string {
  return THUMBNAIL_BASE_URL;
}

/**
 * Clear image configuration cache.
 * No-op in local-only model; kept for test compatibility.
 */
export function clearImageConfigCache(): void {
  // No-op: no cache in local-only model
}
