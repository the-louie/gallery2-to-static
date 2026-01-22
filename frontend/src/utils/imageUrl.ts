/**
 * Image URL construction utilities
 *
 * Provides functions to construct URLs for images and thumbnails from the
 * pathComponent field in the Image data structure. Supports format variants
 * (WebP, AVIF) with automatic extension replacement.
 *
 * ## URL Construction Strategy
 *
 * - Base path: `/images/` (for static hosting)
 * - Full images: `/images/{pathComponent}`
 * - Thumbnails: `/images/__t_{filename}` (prefix-based pattern)
 * - Format variants: Replace extension with `.webp` or `.avif`
 *
 * The thumbPrefix pattern (`__t_`) is applied to the filename portion
 * of the pathComponent. For example:
 * - Full: `/images/album/photo.jpg`
 * - Thumb: `/images/album/__t_photo.jpg`
 * - Full WebP: `/images/album/photo.webp`
 * - Thumb WebP: `/images/album/__t_photo.webp`
 *
 * ## Edge Cases
 *
 * - Empty pathComponent: Returns base path (should not occur in practice)
 * - Special characters: PathComponent is used as-is (assumes proper encoding)
 * - Missing thumbnails: Component should handle gracefully by falling back to full image
 * - Format variants: Original extension is replaced with format extension
 */

import type { Image, Album } from '../types';

/**
 * Default thumbnail prefix pattern
 *
 * Matches the thumbPrefix from config_example.json: "__t_"
 */
const DEFAULT_THUMB_PREFIX = '__t_';

/**
 * Base path for images in static hosting
 */
const IMAGE_BASE_PATH = '/images/';

/**
 * Construct thumbnail URL from pathComponent
 *
 * Applies the thumbnail prefix to the filename portion of the pathComponent.
 * For example: "album/photo.jpg" -> "/images/album/__t_photo.jpg"
 *
 * @param pathComponent - Full path component from image data
 * @param thumbPrefix - Thumbnail prefix (defaults to "__t_")
 * @param format - Optional format variant: 'webp', 'avif', or 'original' (default)
 * @returns Thumbnail URL path
 */
function constructThumbnailUrl(
  pathComponent: string,
  thumbPrefix: string = DEFAULT_THUMB_PREFIX,
  format: 'webp' | 'avif' | 'original' = 'original',
): string {
  if (!pathComponent) {
    return IMAGE_BASE_PATH;
  }

  // Find the last slash to separate directory from filename
  const lastSlashIndex = pathComponent.lastIndexOf('/');

  let directory: string;
  let filename: string;

  if (lastSlashIndex === -1) {
    // No directory, just filename
    directory = '';
    filename = pathComponent;
  } else {
    // Split into directory and filename
    directory = pathComponent.substring(0, lastSlashIndex + 1);
    filename = pathComponent.substring(lastSlashIndex + 1);
  }

  // Apply format extension to filename
  const filenameWithFormat = replaceExtension(filename, format);

  return `${IMAGE_BASE_PATH}${directory}${thumbPrefix}${filenameWithFormat}`;
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
 * @param pathComponent - Full path component from image data
 * @param format - Optional format variant: 'webp', 'avif', or 'original' (default)
 * @returns Full image URL path
 */
function constructFullImageUrl(
  pathComponent: string,
  format: 'webp' | 'avif' | 'original' = 'original',
): string {
  if (!pathComponent) {
    return IMAGE_BASE_PATH;
  }

  const pathWithFormat = replaceExtension(pathComponent, format);
  return `${IMAGE_BASE_PATH}${pathWithFormat}`;
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
 * // Returns: "/images/album/__t_photo.jpg"
 *
 * const fullUrl = getImageUrl(image, false);
 * // Returns: "/images/album/photo.jpg"
 * ```
 */
export function getImageUrl(
  image: Image,
  useThumbnail: boolean = false,
  thumbPrefix?: string,
): string {
  const pathComponent = image.pathComponent;

  if (useThumbnail) {
    return constructThumbnailUrl(pathComponent, thumbPrefix);
  }

  return constructFullImageUrl(pathComponent);
}

/**
 * Get image URL with format variant
 *
 * Constructs an image URL with a specific format variant (WebP, AVIF, or original).
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
 * // Returns: "/images/album/photo.webp"
 *
 * const thumbWebpUrl = getImageUrlWithFormat(image, true, 'webp');
 * // Returns: "/images/album/__t_photo.webp"
 * ```
 */
export function getImageUrlWithFormat(
  image: Image,
  useThumbnail: boolean = false,
  format: 'webp' | 'avif' | 'original' = 'original',
  thumbPrefix?: string,
): string {
  const pathComponent = image.pathComponent;

  if (useThumbnail) {
    return constructThumbnailUrl(pathComponent, thumbPrefix, format);
  }

  return constructFullImageUrl(pathComponent, format);
}

/**
 * Get album thumbnail URL for an Album object
 *
 * Constructs a thumbnail URL from the album's thumbnailPathComponent field.
 * Returns null if the album doesn't have a thumbnail path component.
 *
 * @param album - Album object with optional thumbnailPathComponent field
 * @param thumbPrefix - Optional thumbnail prefix override (defaults to "__t_")
 * @returns Thumbnail URL path, or null if thumbnailPathComponent is missing
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
 * // Returns: "/images/album/__t_photo.jpg"
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
): string | null {
  const pathComponent = album.thumbnailPathComponent;

  if (!pathComponent) {
    return null;
  }

  return constructThumbnailUrl(pathComponent, thumbPrefix);
}
