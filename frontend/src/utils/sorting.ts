/**
 * Sorting Utilities
 *
 * Provides functions for sorting albums and images by various criteria.
 * All sorting functions are stable (maintain relative order for equal values).
 *
 * @module frontend/src/utils/sorting
 */

import type { Child } from '@/types';
import type { SortOption } from '@/types';

/**
 * Sort items by date (timestamp)
 *
 * @param a - First item
 * @param b - Second item
 * @param ascending - If true, sort ascending (oldest first), otherwise descending (newest first)
 * @returns Comparison result (-1, 0, or 1)
 */
function sortByDate(a: Child, b: Child, ascending: boolean): number {
  const aTimestamp = a.timestamp ?? null;
  const bTimestamp = b.timestamp ?? null;

  // Handle null values (nulls last)
  if (aTimestamp === null && bTimestamp === null) {
    return 0;
  }
  if (aTimestamp === null) {
    return 1; // a is null, put it last
  }
  if (bTimestamp === null) {
    return -1; // b is null, put it last
  }

  // Compare timestamps
  const diff = aTimestamp - bTimestamp;
  return ascending ? diff : -diff;
}

/**
 * Sort items by name (title)
 *
 * Performs case-insensitive comparison. Null or empty titles are sorted last.
 *
 * @param a - First item
 * @param b - Second item
 * @param ascending - If true, sort A-Z, otherwise Z-A
 * @returns Comparison result (-1, 0, or 1)
 */
function sortByName(a: Child, b: Child, ascending: boolean): number {
  const aTitle = a.title?.trim() ?? '';
  const bTitle = b.title?.trim() ?? '';

  // Handle empty titles (empty strings last)
  if (aTitle === '' && bTitle === '') {
    return 0;
  }
  if (aTitle === '') {
    return 1; // a is empty, put it last
  }
  if (bTitle === '') {
    return -1; // b is empty, put it last
  }

  // Case-insensitive comparison
  const aLower = aTitle.toLowerCase();
  const bLower = bTitle.toLowerCase();

  if (aLower < bLower) {
    return ascending ? -1 : 1;
  }
  if (aLower > bLower) {
    return ascending ? 1 : -1;
  }

  // If case-insensitive comparison is equal, use case-sensitive for stable sort
  if (aTitle < bTitle) {
    return ascending ? -1 : 1;
  }
  if (aTitle > bTitle) {
    return ascending ? 1 : -1;
  }

  return 0;
}

/**
 * Calculate size for an item
 *
 * For images, size is width * height. For albums, size is null.
 *
 * @param item - Item to calculate size for
 * @returns Size in pixels (width * height) or null if not applicable
 */
function calculateSize(item: Child): number | null {
  // Only images have width and height
  if (item.type === 'GalleryPhotoItem') {
    const width = item.width ?? null;
    const height = item.height ?? null;

    if (width !== null && height !== null) {
      return width * height;
    }
  }

  return null;
}

/**
 * Sort items by size (width * height)
 *
 * Only applicable for images. Albums and items without size information are sorted last.
 *
 * @param a - First item
 * @param b - Second item
 * @param ascending - If true, sort smallest first, otherwise largest first
 * @returns Comparison result (-1, 0, or 1)
 */
function sortBySize(a: Child, b: Child, ascending: boolean): number {
  const aSize = calculateSize(a);
  const bSize = calculateSize(b);

  // Handle null values (nulls last)
  if (aSize === null && bSize === null) {
    return 0;
  }
  if (aSize === null) {
    return 1; // a has no size, put it last
  }
  if (bSize === null) {
    return -1; // b has no size, put it last
  }

  // Compare sizes
  const diff = aSize - bSize;
  return ascending ? diff : -diff;
}

/**
 * Sort an array of items according to the specified sort option
 *
 * This function creates a new sorted array (does not mutate the original).
 * Sorting is stable (maintains relative order for equal values).
 *
 * @param items - Array of items to sort
 * @param sortOption - Sort option specifying field and direction
 * @returns New array with sorted items
 *
 * @example
 * ```ts
 * const sorted = sortItems(albums, 'date-desc'); // Newest first
 * const sortedByName = sortItems(images, 'name-asc'); // A-Z
 * ```
 */
export function sortItems<T extends Child>(
  items: T[],
  sortOption: SortOption
): T[] {
  // Return empty array if items is empty
  if (items.length === 0) {
    return [];
  }

  // Create a copy to avoid mutating the original array
  const sorted = [...items];

  // Parse sort option
  const [field, direction] = sortOption.split('-') as [
    'date' | 'name' | 'size',
    'asc' | 'desc'
  ];
  const ascending = direction === 'asc';

  // Sort based on field
  switch (field) {
    case 'date':
      sorted.sort((a, b) => sortByDate(a, b, ascending));
      break;
    case 'name':
      sorted.sort((a, b) => sortByName(a, b, ascending));
      break;
    case 'size':
      sorted.sort((a, b) => sortBySize(a, b, ascending));
      break;
    default:
      // Unknown sort option, return unsorted (should not happen with TypeScript)
      console.warn(`Unknown sort option: ${sortOption}`);
      return sorted;
  }

  return sorted;
}
