/**
 * Aspect ratio calculation utilities
 *
 * Provides functions to calculate aspect ratios from image dimensions
 * and handle edge cases like null or zero dimensions.
 */

/**
 * Default aspect ratio when dimensions are unavailable
 *
 * Uses 16:9 (1.777...) as a reasonable default for photos.
 */
const DEFAULT_ASPECT_RATIO = 16 / 9;

/**
 * Calculate aspect ratio from width and height
 *
 * Returns the aspect ratio (width / height) or null if dimensions are invalid.
 * Handles null dimensions and zero values gracefully.
 *
 * @param width - Image width in pixels (can be null)
 * @param height - Image height in pixels (can be null)
 * @returns Aspect ratio (width/height) or null if invalid
 *
 * @example
 * ```typescript
 * calculateAspectRatio(1920, 1080); // Returns: 1.777...
 * calculateAspectRatio(1080, 1920); // Returns: 0.5625
 * calculateAspectRatio(null, null); // Returns: null
 * calculateAspectRatio(0, 0); // Returns: null
 * ```
 */
export function calculateAspectRatio(
  width: number | null,
  height: number | null,
): number | null {
  // Return null if either dimension is null
  if (width === null || height === null) {
    return null;
  }

  // Return null if either dimension is zero or negative
  if (width <= 0 || height <= 0) {
    return null;
  }

  return width / height;
}

/**
 * Get aspect ratio with fallback to default
 *
 * Calculates aspect ratio from dimensions, falling back to DEFAULT_ASPECT_RATIO
 * if dimensions are invalid.
 *
 * @param width - Image width in pixels (can be null)
 * @param height - Image height in pixels (can be null)
 * @returns Aspect ratio (width/height) or DEFAULT_ASPECT_RATIO if invalid
 *
 * @example
 * ```typescript
 * getAspectRatioWithFallback(1920, 1080); // Returns: 1.777...
 * getAspectRatioWithFallback(null, null); // Returns: 1.777... (default)
 * ```
 */
export function getAspectRatioWithFallback(
  width: number | null,
  height: number | null,
): number {
  const ratio = calculateAspectRatio(width, height);
  return ratio ?? DEFAULT_ASPECT_RATIO;
}
