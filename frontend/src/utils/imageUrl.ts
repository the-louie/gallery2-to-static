/**
 * Image URL construction utilities
 *
 * Provides functions to construct URLs for images and thumbnails from the
 * pathComponent field in the Image data structure.
 *
 * ## URL Construction Strategy
 *
 * - Base path: `/images/` (for static hosting)
 * - Full images: `/images/{pathComponent}`
 * - Thumbnails: `/images/__t_{filename}` (prefix-based pattern)
 *
 * The thumbPrefix pattern (`__t_`) is applied to the filename portion
 * of the pathComponent. For example:
 * - Full: `/images/album/photo.jpg`
 * - Thumb: `/images/album/__t_photo.jpg`
 *
 * ## Edge Cases
 *
 * - Empty pathComponent: Returns base path (should not occur in practice)
 * - Special characters: PathComponent is used as-is (assumes proper encoding)
 * - Missing thumbnails: Component should handle gracefully by falling back to full image
 */

import type { Image } from '../types';

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
 * @returns Thumbnail URL path
 */
function constructThumbnailUrl(
  pathComponent: string,
  thumbPrefix: string = DEFAULT_THUMB_PREFIX,
): string {
  if (!pathComponent) {
    return IMAGE_BASE_PATH;
  }

  // Find the last slash to separate directory from filename
  const lastSlashIndex = pathComponent.lastIndexOf('/');

  if (lastSlashIndex === -1) {
    // No directory, just filename
    return `${IMAGE_BASE_PATH}${thumbPrefix}${pathComponent}`;
  }

  // Split into directory and filename
  const directory = pathComponent.substring(0, lastSlashIndex + 1);
  const filename = pathComponent.substring(lastSlashIndex + 1);

  return `${IMAGE_BASE_PATH}${directory}${thumbPrefix}${filename}`;
}

/**
 * Construct full image URL from pathComponent
 *
 * @param pathComponent - Full path component from image data
 * @returns Full image URL path
 */
function constructFullImageUrl(pathComponent: string): string {
  if (!pathComponent) {
    return IMAGE_BASE_PATH;
  }

  return `${IMAGE_BASE_PATH}${pathComponent}`;
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
