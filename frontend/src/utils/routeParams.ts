/**
 * Route parameter parsing utilities
 *
 * Provides functions to parse and validate route parameters from URL strings.
 * Handles conversion from string parameters to numeric IDs with validation.
 *
 * @module frontend/src/utils/routeParams
 */

/**
 * Parse and validate album ID from route parameter string
 *
 * Converts a string route parameter to a number and validates it.
 * Returns null if the parameter is invalid (non-numeric, negative, zero, or missing).
 *
 * @param albumIdParam - The album ID parameter from the route (string or undefined)
 * @returns Parsed album ID as number, or null if invalid
 *
 * @example
 * ```typescript
 * const albumId = parseAlbumId('7'); // Returns 7
 * const albumId = parseAlbumId('abc'); // Returns null
 * const albumId = parseAlbumId(undefined); // Returns null
 * ```
 */
export function parseAlbumId(albumIdParam: string | undefined): number | null {
  if (albumIdParam === undefined || albumIdParam === '') {
    return null;
  }

  const parsed = Number.parseInt(albumIdParam, 10);

  // Check if parsing resulted in a valid positive integer
  if (Number.isNaN(parsed) || parsed <= 0 || !Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Parse and validate image ID from route parameter string
 *
 * Converts a string route parameter to a number and validates it.
 * Returns null if the parameter is invalid (non-numeric, negative, zero, or missing).
 *
 * @param imageIdParam - The image ID parameter from the route (string or undefined)
 * @returns Parsed image ID as number, or null if invalid
 *
 * @example
 * ```typescript
 * const imageId = parseImageId('42'); // Returns 42
 * const imageId = parseImageId('xyz'); // Returns null
 * const imageId = parseImageId(undefined); // Returns null
 * ```
 */
export function parseImageId(imageIdParam: string | undefined): number | null {
  if (imageIdParam === undefined || imageIdParam === '') {
    return null;
  }

  const parsed = Number.parseInt(imageIdParam, 10);

  // Check if parsing resulted in a valid positive integer
  if (Number.isNaN(parsed) || parsed <= 0 || !Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}
