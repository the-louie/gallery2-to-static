/**
 * Date formatting utilities for album metadata.
 *
 * Size and Views are not available in the backend; they are omitted from
 * display and may be added as future enhancements.
 *
 * @module frontend/src/utils/dateUtils
 */

/**
 * Format album timestamp as a locale date string.
 * Treats values < 1e12 as Unix seconds (Gallery 2); otherwise milliseconds.
 *
 * @param timestamp - Unix timestamp (seconds or ms), or null
 * @returns Formatted date string, or empty string if null/invalid
 */
export function formatAlbumDate(timestamp: number | null): string {
  if (timestamp == null || typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return '';
  }
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}
