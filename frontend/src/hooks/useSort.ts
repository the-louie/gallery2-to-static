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
 * Default sort option (newest first)
 */
const DEFAULT_SORT_OPTION: SortOption = 'date-desc';

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
 * setOption((prev) => prev === 'date-desc' ? 'date-asc' : 'date-desc');
 * ```
 */
export function useSort(context: 'albums' | 'images'): SortState {
  const storageKey = getStorageKey(context);
  const [option, setOption] = useLocalStorage<SortOption>(
    storageKey,
    DEFAULT_SORT_OPTION
  );

  return {
    option,
    setOption,
  };
}
