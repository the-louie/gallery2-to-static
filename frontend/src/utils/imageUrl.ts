/**
 * Image URL construction utilities
 *
 * Provides functions to construct URLs for images and thumbnails from the
 * pathComponent field in the Image data structure. Supports format variants
 * (WebP, AVIF) with automatic extension replacement.
 *
 * ## URL Construction Strategy
 *
 * - Base URL: Configurable via environment variable (`VITE_IMAGE_BASE_URL`) or
 *   runtime config file (`/image-config.json`). Defaults to `/images` if not configured.
 * - Full images: `{baseUrl}/{pathComponent}` or `{baseUrl}/{urlPath}` when present
 * - Thumbnails: `{thumbnailBaseUrl}/{thumbnailUrlPath}` (e.g. /g2data/thumbnails/album/t__photo.jpg)
 * - Format variants: Replace extension with `.webp` or `.avif`
 *
 * When urlPath/thumbnailUrlPath are present in the JSON, those are used for image URLs.
 *
 * ## Configuration
 *
 * The base URL can be configured via:
 * 1. Runtime config file: `public/image-config.json` with `{"baseUrl": "https://cdn.example.com"}`
 * 2. Environment variable: `VITE_IMAGE_BASE_URL=https://cdn.example.com`
 * 3. Default: `/images` (if neither is configured)
 *
 * See `imageConfig.ts` for more details on configuration.
 *
 * ## Edge Cases
 *
 * - Empty pathComponent: Returns base URL (should not occur in practice)
 * - Special characters: PathComponent is used as-is (assumes proper encoding)
 * - Missing thumbnails: Component should handle gracefully by falling back to full image
 * - Format variants: Original extension is replaced with format extension
 */

import type { Image, Album } from '../types';
import { getImageBaseUrl, getThumbnailBaseUrl } from './imageConfig';

/**
 * Thumbnail filename prefix (e.g. t__photo.jpg under g2data/thumbnails).
 */
const DEFAULT_THUMB_PREFIX = 't__';

/**
 * Strip leading slashes from a path segment so concatenation with baseUrl (no trailing slash) never produces double slashes.
 */
function ensureNoLeadingSlash(path: string): string {
  return path.replace(/^\/+/, '');
}

/**
 * Construct thumbnail URL from pathComponent
 *
 * Applies the thumbnail prefix to the filename portion of the pathComponent.
 * Uses the configured base URL from imageConfig.
 *
 * For example: "album/photo.jpg" -> "/images/album/t__photo.jpg" (default)
 * or "https://cdn.example.com/album/t__photo.jpg" (if configured)
 *
 * @param pathComponent - Full path component from image data
 * @param thumbPrefix - Thumbnail prefix (defaults to "t__")
 * @param format - Optional format variant: 'webp', 'avif', or 'original' (default)
 * @returns Thumbnail URL path
 */
function constructThumbnailUrl(
  pathComponent: string | null,
  thumbPrefix: string = DEFAULT_THUMB_PREFIX,
  format: 'webp' | 'avif' | 'original' = 'original',
  baseUrlOverride?: string | null,
): string {
  const baseUrl = baseUrlOverride ?? getThumbnailBaseUrl();

  if (!pathComponent) {
    return baseUrl;
  }

  const path = ensureNoLeadingSlash(pathComponent);
  // Find the last slash to separate directory from filename
  const lastSlashIndex = path.lastIndexOf('/');

  let directory: string;
  let filename: string;

  if (lastSlashIndex === -1) {
    // No directory, just filename
    directory = '';
    filename = path;
  } else {
    // Split into directory and filename
    directory = path.substring(0, lastSlashIndex + 1);
    filename = path.substring(lastSlashIndex + 1);
  }

  // Apply format extension to filename
  const filenameWithFormat = replaceExtension(filename, format);

  // Construct URL: baseUrl + directory + thumbPrefix + filename
  // baseUrl is normalized (no trailing slash)
  // directory already includes trailing slash if present, or is empty string
  // For absolute URLs, we need to ensure proper concatenation
  const pathPart = directory
    ? `${directory}${thumbPrefix}${filenameWithFormat}`
    : `${thumbPrefix}${filenameWithFormat}`;
  return `${baseUrl}/${pathPart}`;
}

/**
 * Replace file extension with format extension
 *
 * @param pathComponent - Path component with original extension
 * @param format - Format to use: 'webp', 'avif', or 'original'
 * @returns Path component with format extension
 */
function replaceExtension(
  pathComponent: string,
  format: 'webp' | 'avif' | 'original',
): string {
  if (format === 'original') {
    return pathComponent;
  }

  // Find last dot (extension separator)
  const lastDotIndex = pathComponent.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // No extension, append format extension
    return `${pathComponent}.${format}`;
  }

  // Replace extension
  const basePath = pathComponent.substring(0, lastDotIndex);
  return `${basePath}.${format}`;
}

/**
 * Construct full image URL from pathComponent
 *
 * Uses the configured base URL from imageConfig.
 *
 * For example: "album/photo.jpg" -> "/images/album/photo.jpg" (default)
 * or "https://cdn.example.com/album/photo.jpg" (if configured)
 *
 * @param pathComponent - Full path component from image data
 * @param format - Optional format variant: 'webp', 'avif', or 'original' (default)
 * @returns Full image URL path
 */
function constructFullImageUrl(
  pathComponent: string | null,
  format: 'webp' | 'avif' | 'original' = 'original',
  baseUrlOverride?: string | null,
): string {
  const baseUrl = baseUrlOverride ?? getImageBaseUrl();

  if (!pathComponent) {
    return baseUrl;
  }

  const pathWithFormat = replaceExtension(ensureNoLeadingSlash(pathComponent), format);
  // baseUrl is normalized (no trailing slash)
  // pathComponent is the full path (e.g., "album/photo.jpg")
  return `${baseUrl}/${pathWithFormat}`;
}

/**
 * Get image URL for an Image object
 *
 * Constructs either a thumbnail or full image URL based on the useThumbnail parameter.
 * Uses the image's pathComponent field to build the URL.
 *
 * @param image - Image object with pathComponent field
 * @param useThumbnail - Whether to return thumbnail URL (default: false)
 * @param thumbPrefix - Optional thumbnail prefix override
 * @returns Image URL path
 *
 * @example
 * ```typescript
 * const image: Image = {
 *   id: 1,
 *   type: 'GalleryPhotoItem',
 *   pathComponent: 'album/photo.jpg',
 *   // ... other fields
 * };
 *
 * const thumbUrl = getImageUrl(image, true);
 * // Returns: "/images/album/t__photo.jpg" (default) or configured base URL
 *
 * const fullUrl = getImageUrl(image, false);
 * // Returns: "/images/album/photo.jpg" (default) or configured base URL
 * ```
 */
export function getImageUrl(
  image: Image,
  useThumbnail: boolean = false,
  thumbPrefix?: string,
  baseUrlOverride?: string | null,
): string {
  const path = image.urlPath ?? image.pathComponent;
  const prefix = thumbPrefix ?? DEFAULT_THUMB_PREFIX;

  if (useThumbnail) {
    return constructThumbnailUrl(path, prefix, 'original', baseUrlOverride);
  }

  return constructFullImageUrl(path, 'original', baseUrlOverride);
}

/**
 * Get image URL with format variant
 *
 * The app currently loads only original-format assets from the data JSON; the format
 * parameter is for possible future use. Constructs an image URL with a specific format variant (WebP, AVIF, or original).
 * Supports both thumbnail and full image URLs.
 *
 * @param image - Image object with pathComponent field
 * @param useThumbnail - Whether to return thumbnail URL (default: false)
 * @param format - Format variant: 'webp', 'avif', or 'original' (default)
 * @param thumbPrefix - Optional thumbnail prefix override
 * @returns Image URL path with format extension
 *
 * @example
 * ```typescript
 * const image: Image = {
 *   id: 1,
 *   type: 'GalleryPhotoItem',
 *   pathComponent: 'album/photo.jpg',
 *   // ... other fields
 * };
 *
 * const webpUrl = getImageUrlWithFormat(image, false, 'webp');
 * // Returns: "/images/album/photo.webp" (default) or configured base URL
 *
 * const thumbWebpUrl = getImageUrlWithFormat(image, true, 'webp');
 * // Returns: "/images/album/t__photo.webp" (default) or configured base URL
 * ```
 */
export function getImageUrlWithFormat(
  image: Image,
  useThumbnail: boolean = false,
  format: 'webp' | 'avif' | 'original' = 'original',
  thumbPrefix?: string,
  baseUrlOverride?: string | null,
): string {
  const path = image.urlPath ?? image.pathComponent;
  const prefix = thumbPrefix ?? DEFAULT_THUMB_PREFIX;

  if (useThumbnail) {
    return constructThumbnailUrl(path, prefix, format, baseUrlOverride);
  }

  return constructFullImageUrl(path, format, baseUrlOverride);
}

/**
 * Get album thumbnail URL for an Album object
 *
 * Fallback order: thumbnailUrlPath, highlightThumbnailUrlPath (thumbnail of highlight image),
 * thumbnailPathComponent (built with thumb prefix), highlightImageUrl (full image path). Returns null if none are set.
 *
 * @param album - Album with optional thumbnailUrlPath, highlightThumbnailUrlPath, thumbnailPathComponent, or highlightImageUrl
 * @param thumbPrefix - Optional thumbnail prefix override (defaults to "t__")
 * @returns Thumbnail URL path, or null if no thumbnail path available
 *
 * @example
 * ```typescript
 * const album: Album = {
 *   id: 1,
 *   type: 'GalleryAlbumItem',
 *   thumbnailPathComponent: 'album/photo.jpg',
 *   // ... other fields
 * };
 *
 * const thumbUrl = getAlbumThumbnailUrl(album);
 * // Returns: "/images/album/t__photo.jpg" (default) or configured base URL
 *
 * const albumWithoutThumb: Album = {
 *   id: 2,
 *   type: 'GalleryAlbumItem',
 *   // ... no thumbnailPathComponent
 * };
 *
 * const noThumbUrl = getAlbumThumbnailUrl(albumWithoutThumb);
 * // Returns: null
 * ```
 */
export function getAlbumThumbnailUrl(
  album: Album,
  thumbPrefix?: string,
  baseUrlOverride?: string | null,
): string | null {
  const baseUrl = baseUrlOverride ?? getThumbnailBaseUrl();
  if (album.thumbnailUrlPath && album.thumbnailUrlPath.length > 0) {
    return `${baseUrl}/${ensureNoLeadingSlash(album.thumbnailUrlPath)}`;
  }

  if (album.highlightThumbnailUrlPath && album.highlightThumbnailUrlPath.length > 0) {
    return `${baseUrl}/${ensureNoLeadingSlash(album.highlightThumbnailUrlPath)}`;
  }

  const pathComponent = album.thumbnailPathComponent;
  if (pathComponent) {
    const prefix = thumbPrefix ?? DEFAULT_THUMB_PREFIX;
    return constructThumbnailUrl(pathComponent, prefix, 'original', baseUrl);
  }

  if (album.highlightImageUrl && album.highlightImageUrl.length > 0) {
    return `${baseUrl}/${ensureNoLeadingSlash(album.highlightImageUrl)}`;
  }

  return null;
}

/**
 * Get album highlight image URL for use as block background.
 * Returns a full URL only when album.highlightImageUrl is set (non-empty); does not use
 * thumbnailUrlPath or thumbnailPathComponent. For use where the requirement is explicitly
 * the highlight image (e.g. RootAlbumListBlock background).
 *
 * @param album - Album with optional highlightImageUrl
 * @returns Full image URL, or null if highlightImageUrl is missing or empty
 */
export function getAlbumHighlightImageUrl(
  album: Album,
  baseUrlOverride?: string | null,
): string | null {
  if (!album.highlightImageUrl || album.highlightImageUrl.length === 0) {
    return null;
  }
  const baseUrl = baseUrlOverride ?? getImageBaseUrl();
  return `${baseUrl}/${ensureNoLeadingSlash(album.highlightImageUrl)}`;
}
