/**
 * Type Filter Component
 *
 * Provides type filtering UI with radio buttons for selecting album type.
 * Options: All, Albums Only, Images Only.
 *
 * ## Features
 *
 * - Radio button selection for type filtering
 * - Accessible with proper ARIA labels
 * - Keyboard navigable
 * - Responsive design
 *
 * ## Usage
 *
 * ```tsx
 * import { TypeFilter } from './components/FilterPanel';
 *
 * function FilterPanel() {
 *   const { criteria, setCriteria } = useFilter();
 *
 *   return (
 *     <TypeFilter
 *       criteria={criteria}
 *       onCriteriaChange={setCriteria}
 *     />
 *   );
 * }
 * ```
 *
 * @module frontend/src/components/FilterPanel
 */

import React, { useCallback } from 'react';
import type { FilterCriteria } from '@/types';
import './TypeFilter.css';

/**
 * Props for TypeFilter component
 */
export interface TypeFilterProps {
  /** Current filter criteria */
  criteria: FilterCriteria;
  /** Function to update filter criteria */
  onCriteriaChange: (criteria: FilterCriteria) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Type filter option
 */
type TypeFilterOption = 'all' | 'GalleryAlbumItem' | 'GalleryPhotoItem';

/**
 * Type Filter Component
 *
 * Provides type filtering with radio buttons.
 *
 * @param props - Component props
 * @returns Type filter component
 */
export function TypeFilter({
  criteria,
  onCriteriaChange,
  className,
}: TypeFilterProps): React.ReactElement {
  // Get current type filter value (default to 'all')
  const currentType: TypeFilterOption =
    (criteria.albumType as TypeFilterOption) || 'all';

  // Handle type change
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newType = e.target.value as TypeFilterOption;
      const newCriteria: FilterCriteria = {
        ...criteria,
        albumType: newType === 'all' ? undefined : newType,
      };
      onCriteriaChange(newCriteria);
    },
    [criteria, onCriteriaChange]
  );

  const componentClassName = className
    ? `type-filter ${className}`
    : 'type-filter';

  return (
    <div
      className={componentClassName}
      role="radiogroup"
      aria-label="Type filter"
    >
      <fieldset className="type-filter-fieldset">
        <legend className="type-filter-legend">Filter by Type</legend>
        <div className="type-filter-options">
          <div className="type-filter-option">
            <input
              id="type-filter-all"
              type="radio"
              name="type-filter"
              value="all"
              checked={currentType === 'all'}
              onChange={handleTypeChange}
              className="type-filter-input"
            />
            <label htmlFor="type-filter-all" className="type-filter-label">
              All
            </label>
          </div>
          <div className="type-filter-option">
            <input
              id="type-filter-albums"
              type="radio"
              name="type-filter"
              value="GalleryAlbumItem"
              checked={currentType === 'GalleryAlbumItem'}
              onChange={handleTypeChange}
              className="type-filter-input"
            />
            <label htmlFor="type-filter-albums" className="type-filter-label">
              Albums Only
            </label>
          </div>
          <div className="type-filter-option">
            <input
              id="type-filter-images"
              type="radio"
              name="type-filter"
              value="GalleryPhotoItem"
              checked={currentType === 'GalleryPhotoItem'}
              onChange={handleTypeChange}
              className="type-filter-input"
            />
            <label htmlFor="type-filter-images" className="type-filter-label">
              Images Only
            </label>
          </div>
        </div>
      </fieldset>
    </div>
  );
}

export default TypeFilter;
