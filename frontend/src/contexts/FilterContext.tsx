/**
 * Filter Context
 *
 * Provides filter state management for the application. Supports filtering
 * albums and images by date range and type with state management.
 *
 * ## Features
 *
 * - Date range filtering
 * - Type filtering (albums, images, or all)
 * - Multi-filter combination support
 * - Memoized context value to prevent unnecessary re-renders
 * - TypeScript type safety
 *
 * ## Usage
 *
 * ```tsx
 * // In your app entry point
 * import { FilterProvider } from './contexts/FilterContext';
 *
 * function App() {
 *   return (
 *     <FilterProvider>
 *       <YourApp />
 *     </FilterProvider>
 *   );
 * }
 *
 * // In any component
 * import { useFilter } from './contexts/FilterContext';
 *
 * function FilterButton() {
 *   const { criteria, setCriteria, clearFilters, hasActiveFilters } = useFilter();
 *
 *   return (
 *     <div>
 *       {hasActiveFilters() && (
 *         <button onClick={clearFilters}>Clear Filters</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import type { FilterCriteria, FilterState } from '@/types';
import { hasActiveFilters as checkHasActiveFilters } from '@/utils/filterUtils';

/**
 * Default filter criteria (no filters active)
 */
const defaultCriteria: FilterCriteria = {};

/**
 * Filter context value interface
 */
export interface FilterContextValue extends FilterState {}

/**
 * Default context value (used when outside provider)
 */
const defaultContextValue: FilterContextValue = {
  criteria: defaultCriteria,
  setCriteria: () => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'FilterProvider not found. Make sure your component is wrapped in FilterProvider.'
      );
    }
  },
  clearFilters: () => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'FilterProvider not found. Make sure your component is wrapped in FilterProvider.'
      );
    }
  },
  hasActiveFilters: () => false,
};

/**
 * Filter Context
 */
const FilterContext = createContext<FilterContextValue>(defaultContextValue);
FilterContext.displayName = 'FilterContext';

/**
 * Props for FilterProvider component
 */
export interface FilterProviderProps {
  /** Child components */
  children: React.ReactNode;
  /** Default criteria when initializing */
  defaultCriteria?: FilterCriteria;
}

/**
 * Filter Provider Component
 *
 * Wraps your application to provide filter context. Manages filter state
 * and provides functions to update and clear filters.
 *
 * @param props - Component props
 * @returns Provider component
 *
 * @example
 * ```tsx
 * <FilterProvider defaultCriteria={{ albumType: 'GalleryPhotoItem' }}>
 *   <App />
 * </FilterProvider>
 * ```
 */
export function FilterProvider({
  children,
  defaultCriteria: initialCriteria = defaultCriteria,
}: FilterProviderProps): React.ReactElement {
  // Filter criteria state
  const [criteria, setCriteriaState] = useState<FilterCriteria>(initialCriteria);

  // Function to update filter criteria
  const setCriteria = useCallback((newCriteria: FilterCriteria) => {
    setCriteriaState(newCriteria);
  }, []);

  // Function to clear all filters
  const clearFilters = useCallback(() => {
    setCriteriaState(defaultCriteria);
  }, []);

  // Function to check if any filters are active
  const hasActiveFiltersFn = useCallback(() => {
    return checkHasActiveFilters(criteria);
  }, [criteria]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<FilterContextValue>(
    () => ({
      criteria,
      setCriteria,
      clearFilters,
      hasActiveFilters: hasActiveFiltersFn,
    }),
    [criteria, setCriteria, clearFilters, hasActiveFiltersFn]
  );

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
}

/**
 * Hook to access filter context
 *
 * Must be used within a FilterProvider. Throws an error if used outside.
 *
 * @returns Filter context value
 * @throws Error if used outside FilterProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { criteria, setCriteria, clearFilters, hasActiveFilters } = useFilter();
 *
 *   return (
 *     <div>
 *       {hasActiveFilters() && (
 *         <button onClick={clearFilters}>Clear Filters</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFilter(): FilterContextValue {
  const context = useContext(FilterContext);

  // The context will always have a value (either from provider or default)
  // but we can check if setCriteria is the warning function
  if (context.setCriteria === defaultContextValue.setCriteria) {
    throw new Error('useFilter must be used within a FilterProvider');
  }

  return context;
}

// Export context for advanced use cases (like testing)
export { FilterContext };
