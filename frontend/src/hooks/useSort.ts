/**
 * React hook for sort state management with localStorage persistence
 *
 * Provides sort state for albums or images with automatic persistence to localStorage.
 * Supports separate sort preferences for albums and images.
 *
 * ## Features
 *
 * - Generic type support for SortOption
 * - Automatic localStorage persistence
 * - Graceful error handling for localStorage unavailability
 * - Fallback to default sort option on errors
 * - Separate preferences for albums and images
 *
 * ## Usage
 *
 * ```tsx
 * function AlbumGrid() {
 *   const { option, setOption } = useSort('albums');
 *
 *   return (
 *     <SortDropdown
 *       currentOption={option}
 *       onOptionChange={setOption}
 *     />
 *   );
 * }
 * ```
 *
 * @module frontend/src/hooks/useSort
 */

import { useLocalStorage } from './useLocalStorage';
import type { SortOption, SortState } from '@/types';

/**
 * Default sort option (Gallery 2 order)
 */
const DEFAULT_SORT_OPTION: SortOption = 'order-asc';

/** Every valid SortOption, for validating values read back from localStorage (LOGIC-25). */
const SORT_OPTIONS: readonly SortOption[] = [
  'date-asc',
  'date-desc',
  'name-asc',
  'name-desc',
  'size-asc',
  'size-desc',
  'order-asc',
];

export function isSortOption(value: unknown): value is SortOption {
  return typeof value === 'string' && (SORT_OPTIONS as readonly string[]).includes(value);
}

/**
 * Get localStorage key for sort preference
 *
 * @param context - 'albums' or 'images'
 * @returns localStorage key
 */
function getStorageKey(context: 'albums' | 'images'): string {
  return `gallery-sort-${context}`;
}

/**
 * Hook to manage sort state with localStorage persistence
 *
 * @param context - 'albums' or 'images' to determine which preference to use
 * @returns SortState with current option and setter function
 *
 * @example
 * ```tsx
 * const { option, setOption } = useSort('albums');
 *
 * // Direct update
 * setOption('name-asc');
 *
 * // Functional update (not typically needed, but supported)
 * setOption((prev) => prev === 'order-asc' ? 'date-desc' : 'order-asc');
 * ```
 */
export function useSort(context: 'albums' | 'images'): SortState {
  const storageKey = getStorageKey(context);
  const [option, setOption] = useLocalStorage<SortOption>(
    storageKey,
    DEFAULT_SORT_OPTION
  );

  // A stored value is whatever JSON was in localStorage (old version, hand-edited, another app):
  // anything that is not a known option falls back to the default instead of crashing sortItems.
  return {
    option: isSortOption(option) ? option : DEFAULT_SORT_OPTION,
    setOption,
  };
}
