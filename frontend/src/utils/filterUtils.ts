/**
 * Filter utilities for albums and images
 *
 * Provides functions to filter arrays of Child items based on FilterCriteria.
 * Supports date range filtering, type filtering, and multi-filter combinations.
 *
 * ## Features
 *
 * - Date range filtering (timestamp-based)
 * - Type filtering (albums, images, or all)
 * - Multi-filter combination (AND logic)
 * - Efficient filtering algorithms
 * - Type-safe with TypeScript
 *
 * ## Usage
 *
 * ```typescript
 * import { applyFilters } from './utils/filterUtils';
 * import type { FilterCriteria, Child } from '@/types';
 *
 * const criteria: FilterCriteria = {
 *   dateRange: { start: 1000000000000, end: 2000000000000 },
 *   albumType: 'GalleryPhotoItem'
 * };
 *
 * const filtered = applyFilters(items, criteria);
 * ```
 *
 * @module frontend/src/utils/filterUtils
 */

import type { Child, FilterCriteria } from '@/types';
import { isAlbum, isImage } from '@/types';

/**
 * Apply date range filter to an item
 *
 * Checks if the item's timestamp falls within the specified date range.
 * Items with null or undefined timestamps are excluded.
 *
 * @param item - The item to check
 * @param dateRange - Date range filter criteria
 * @returns True if item matches the date range filter
 */
function matchesDateRange(
  item: Child,
  dateRange: { start: number; end: number }
): boolean {
  // Exclude items with invalid timestamps
  if (item.timestamp == null || typeof item.timestamp !== 'number') {
    return false;
  }

  // Check if timestamp is within range (inclusive)
  return item.timestamp >= dateRange.start && item.timestamp <= dateRange.end;
}

/**
 * Apply type filter to an item
 *
 * Checks if the item matches the specified type filter.
 *
 * @param item - The item to check
 * @param albumType - Type filter criteria ('all', 'GalleryAlbumItem', or 'GalleryPhotoItem')
 * @returns True if item matches the type filter
 */
function matchesType(
  item: Child,
  albumType: 'GalleryAlbumItem' | 'GalleryPhotoItem' | 'all'
): boolean {
  // 'all' means no type filtering
  if (albumType === 'all') {
    return true;
  }

  // Check if item type matches
  return item.type === albumType;
}

/**
 * Apply filters to an array of items
 *
 * Filters items based on the provided criteria. All active filters are combined
 * using AND logic (item must match all active filters).
 *
 * @param items - Array of items to filter
 * @param criteria - Filter criteria to apply
 * @returns Filtered array of items
 *
 * @example
 * ```typescript
 * const criteria: FilterCriteria = {
 *   dateRange: { start: 1000000000000, end: 2000000000000 },
 *   albumType: 'GalleryPhotoItem'
 * };
 *
 * const filtered = applyFilters(items, criteria);
 * ```
 */
export function applyFilters(
  items: Child[],
  criteria: FilterCriteria
): Child[] {
  // Return empty array if items array is empty
  if (items.length === 0) {
    return [];
  }

  // If no filters are active, return all items
  const hasDateRange = criteria.dateRange != null;
  const hasTypeFilter = criteria.albumType != null && criteria.albumType !== 'all';

  if (!hasDateRange && !hasTypeFilter) {
    return items;
  }

  // Apply filters using AND logic (item must match all active filters)
  return items.filter((item) => {
    // Check date range filter
    if (hasDateRange && !matchesDateRange(item, criteria.dateRange!)) {
      return false;
    }

    // Check type filter
    if (hasTypeFilter && !matchesType(item, criteria.albumType!)) {
      return false;
    }

    // Item matches all active filters
    return true;
  });
}

/**
 * Count active filters in criteria
 *
 * Returns the number of active (non-empty) filters in the criteria.
 *
 * @param criteria - Filter criteria to count
 * @returns Number of active filters
 */
export function countActiveFilters(criteria: FilterCriteria): number {
  let count = 0;

  if (criteria.dateRange != null) {
    count++;
  }

  if (criteria.albumType != null && criteria.albumType !== 'all') {
    count++;
  }

  return count;
}

/**
 * Check if any filters are active
 *
 * Returns true if at least one filter is active in the criteria.
 *
 * @param criteria - Filter criteria to check
 * @returns True if any filters are active
 */
export function hasActiveFilters(criteria: FilterCriteria): boolean {
  return countActiveFilters(criteria) > 0;
}
