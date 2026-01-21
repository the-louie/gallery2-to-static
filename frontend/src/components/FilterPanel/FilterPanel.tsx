/**
 * Filter Panel Component
 *
 * Main filter panel component that integrates all filter UI components.
 * Provides date range filtering, type filtering, and active filter badges.
 *
 * ## Features
 *
 * - Date range filtering
 * - Type filtering
 * - Active filter badges
 * - Clear filters button
 * - Collapsible panel (optional, for mobile)
 * - Accessible with proper ARIA labels
 * - Keyboard navigable
 * - Responsive design
 *
 * ## Usage
 *
 * ```tsx
 * import { FilterPanel } from './components/FilterPanel';
 *
 * function AlbumPage() {
 *   return (
 *     <div>
 *       <FilterPanel />
 *       <AlbumGrid />
 *     </div>
 *   );
 * }
 * ```
 *
 * @module frontend/src/components/FilterPanel
 */

import React, { useState, useCallback } from 'react';
import { useFilter } from '@/contexts/FilterContext';
import { DateRangeFilter } from './DateRangeFilter';
import { TypeFilter } from './TypeFilter';
import { FilterBadges } from './FilterBadges';
import './FilterPanel.css';

/**
 * Props for FilterPanel component
 */
export interface FilterPanelProps {
  /** Optional CSS class name */
  className?: string;
}

/**
 * Filter Panel Component
 *
 * Main filter panel that integrates all filter components.
 *
 * @param props - Component props
 * @returns Filter panel component
 */
export function FilterPanel({
  className,
}: FilterPanelProps): React.ReactElement {
  const { criteria, setCriteria, clearFilters, hasActiveFilters } = useFilter();
  const [isExpanded, setIsExpanded] = useState(true);

  // Handle toggle panel (for mobile)
  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const componentClassName = className
    ? `filter-panel ${className}`
    : 'filter-panel';

  return (
    <div className={componentClassName} role="region" aria-label="Filter panel">
      <div className="filter-panel-header">
        <h2 className="filter-panel-title">Filters</h2>
        <button
          type="button"
          onClick={handleToggle}
          className="filter-panel-toggle"
          aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      {isExpanded && (
        <div className="filter-panel-content">
          <DateRangeFilter criteria={criteria} onCriteriaChange={setCriteria} />
          <TypeFilter criteria={criteria} onCriteriaChange={setCriteria} />
          <FilterBadges criteria={criteria} onCriteriaChange={setCriteria} />
          {hasActiveFilters() && (
            <button
              type="button"
              onClick={clearFilters}
              className="filter-panel-clear"
              aria-label="Clear all filters"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default FilterPanel;
