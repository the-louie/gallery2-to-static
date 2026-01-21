/**
 * Filter Badges Component
 *
 * Displays active filter badges with remove buttons. Shows active filter count.
 *
 * ## Features
 *
 * - Displays badges for each active filter
 * - Remove button for each badge
 * - Active filter count display
 * - Accessible with proper ARIA labels
 * - Keyboard navigable
 *
 * ## Usage
 *
 * ```tsx
 * import { FilterBadges } from './components/FilterPanel';
 *
 * function FilterPanel() {
 *   const { criteria, setCriteria } = useFilter();
 *
 *   return (
 *     <FilterBadges
 *       criteria={criteria}
 *       onCriteriaChange={setCriteria}
 *     />
 *   );
 * }
 * ```
 *
 * @module frontend/src/components/FilterPanel
 */

import React, { useCallback, useMemo } from 'react';
import type { FilterCriteria } from '@/types';
import { countActiveFilters } from '@/utils/filterUtils';
import './FilterBadges.css';

/**
 * Props for FilterBadges component
 */
export interface FilterBadgesProps {
  /** Current filter criteria */
  criteria: FilterCriteria;
  /** Function to update filter criteria */
  onCriteriaChange: (criteria: FilterCriteria) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Filter Badges Component
 *
 * Displays active filter badges with remove buttons.
 *
 * @param props - Component props
 * @returns Filter badges component
 */
export function FilterBadges({
  criteria,
  onCriteriaChange,
  className,
}: FilterBadgesProps): React.ReactElement {
  // Count active filters
  const activeCount = useMemo(
    () => countActiveFilters(criteria),
    [criteria]
  );

  // Handle remove date range filter
  const handleRemoveDateRange = useCallback(() => {
    const newCriteria: FilterCriteria = {
      ...criteria,
      dateRange: undefined,
    };
    onCriteriaChange(newCriteria);
  }, [criteria, onCriteriaChange]);

  // Handle remove type filter
  const handleRemoveType = useCallback(() => {
    const newCriteria: FilterCriteria = {
      ...criteria,
      albumType: undefined,
    };
    onCriteriaChange(newCriteria);
  }, [criteria, onCriteriaChange]);

  // Format date range for display
  const formatDateRange = useCallback((start: number, end: number): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startStr = startDate.toLocaleDateString();
    const endStr = endDate.toLocaleDateString();
    return `${startStr} - ${endStr}`;
  }, []);

  // Format type for display
  const formatType = useCallback(
    (type: 'GalleryAlbumItem' | 'GalleryPhotoItem'): string => {
      switch (type) {
        case 'GalleryAlbumItem':
          return 'Albums Only';
        case 'GalleryPhotoItem':
          return 'Images Only';
        default:
          return type;
      }
    },
    []
  );

  const componentClassName = className
    ? `filter-badges ${className}`
    : 'filter-badges';

  // Don't render if no active filters
  if (activeCount === 0) {
    return <div className={componentClassName} aria-label="Active filters" />;
  }

  return (
    <div className={componentClassName} role="group" aria-label="Active filters">
      <div className="filter-badges-header">
        <span className="filter-badges-count">
          {activeCount} {activeCount === 1 ? 'filter' : 'filters'} active
        </span>
      </div>
      <div className="filter-badges-list">
        {criteria.dateRange && (
          <div className="filter-badge" role="listitem">
            <span className="filter-badge-label">
              Date: {formatDateRange(criteria.dateRange.start, criteria.dateRange.end)}
            </span>
            <button
              type="button"
              onClick={handleRemoveDateRange}
              className="filter-badge-remove"
              aria-label="Remove date range filter"
            >
              ×
            </button>
          </div>
        )}
        {criteria.albumType &&
          criteria.albumType !== 'all' && (
            <div className="filter-badge" role="listitem">
              <span className="filter-badge-label">
                Type: {formatType(criteria.albumType)}
              </span>
              <button
                type="button"
                onClick={handleRemoveType}
                className="filter-badge-remove"
                aria-label="Remove type filter"
              >
                ×
              </button>
            </div>
          )}
      </div>
    </div>
  );
}

export default FilterBadges;
