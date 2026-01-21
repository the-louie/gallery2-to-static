/**
 * Date Range Filter Component
 *
 * Provides date range filtering UI with start and end date inputs.
 * Converts date inputs to timestamps for filter criteria.
 *
 * ## Features
 *
 * - Start and end date inputs
 * - Date validation (start <= end)
 * - Accessible with proper ARIA labels
 * - Keyboard navigable
 * - Responsive design
 *
 * ## Usage
 *
 * ```tsx
 * import { DateRangeFilter } from './components/FilterPanel';
 *
 * function FilterPanel() {
 *   const { criteria, setCriteria } = useFilter();
 *
 *   return (
 *     <DateRangeFilter
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
import './DateRangeFilter.css';

/**
 * Props for DateRangeFilter component
 */
export interface DateRangeFilterProps {
  /** Current filter criteria */
  criteria: FilterCriteria;
  /** Function to update filter criteria */
  onCriteriaChange: (criteria: FilterCriteria) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Convert timestamp to date string (YYYY-MM-DD format)
 *
 * @param timestamp - Timestamp in milliseconds
 * @returns Date string in YYYY-MM-DD format
 */
function timestampToDateString(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert date string to timestamp (start of day in milliseconds)
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Timestamp in milliseconds (start of day)
 */
function dateStringToTimestamp(dateString: string): number {
  const date = new Date(dateString);
  return date.getTime();
}

/**
 * Date Range Filter Component
 *
 * Provides date range filtering with start and end date inputs.
 *
 * @param props - Component props
 * @returns Date range filter component
 */
export function DateRangeFilter({
  criteria,
  onCriteriaChange,
  className,
}: DateRangeFilterProps): React.ReactElement {
  // Convert timestamps to date strings for input values
  const startDate = useMemo(() => {
    if (criteria.dateRange?.start != null) {
      return timestampToDateString(criteria.dateRange.start);
    }
    return '';
  }, [criteria.dateRange?.start]);

  const endDate = useMemo(() => {
    if (criteria.dateRange?.end != null) {
      return timestampToDateString(criteria.dateRange.end);
    }
    return '';
  }, [criteria.dateRange?.end]);

  // Handle start date change
  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStartDate = e.target.value;
      const newCriteria: FilterCriteria = { ...criteria };

      if (newStartDate) {
        const startTimestamp = dateStringToTimestamp(newStartDate);
        const endTimestamp = criteria.dateRange?.end;

        // Only create dateRange if we have both dates, or if end date exists
        if (endTimestamp) {
          // If start date is after end date, adjust end date
          if (startTimestamp > endTimestamp) {
            const nextDay = new Date(startTimestamp);
            nextDay.setDate(nextDay.getDate() + 1);
            newCriteria.dateRange = {
              start: startTimestamp,
              end: nextDay.getTime(),
            };
          } else {
            newCriteria.dateRange = {
              start: startTimestamp,
              end: endTimestamp,
            };
          }
        } else {
          // Only start date provided, don't create dateRange yet
          newCriteria.dateRange = undefined;
        }
      } else {
        // Start date cleared
        if (criteria.dateRange?.end) {
          // If end date still exists, clear the whole dateRange
          newCriteria.dateRange = undefined;
        } else {
          newCriteria.dateRange = undefined;
        }
      }

      onCriteriaChange(newCriteria);
    },
    [criteria, onCriteriaChange]
  );

  // Handle end date change
  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newEndDate = e.target.value;
      const newCriteria: FilterCriteria = { ...criteria };

      if (newEndDate) {
        const endTimestamp = dateStringToTimestamp(newEndDate);
        const startTimestamp = criteria.dateRange?.start;

        // Only create dateRange if we have both dates, or if start date exists
        if (startTimestamp) {
          // If end date is before start date, adjust start date
          if (endTimestamp < startTimestamp) {
            const prevDay = new Date(endTimestamp);
            prevDay.setDate(prevDay.getDate() - 1);
            newCriteria.dateRange = {
              start: prevDay.getTime(),
              end: endTimestamp,
            };
          } else {
            newCriteria.dateRange = {
              start: startTimestamp,
              end: endTimestamp,
            };
          }
        } else {
          // Only end date provided, don't create dateRange yet
          newCriteria.dateRange = undefined;
        }
      } else {
        // End date cleared
        if (criteria.dateRange?.start) {
          // If start date still exists, clear the whole dateRange
          newCriteria.dateRange = undefined;
        } else {
          newCriteria.dateRange = undefined;
        }
      }

      onCriteriaChange(newCriteria);
    },
    [criteria, onCriteriaChange]
  );

  // Handle clear date range
  const handleClear = useCallback(() => {
    const newCriteria: FilterCriteria = {
      ...criteria,
      dateRange: undefined,
    };
    onCriteriaChange(newCriteria);
  }, [criteria, onCriteriaChange]);

  const componentClassName = className
    ? `date-range-filter ${className}`
    : 'date-range-filter';

  return (
    <div className={componentClassName} role="group" aria-label="Date range filter">
      <div className="date-range-filter-inputs">
        <div className="date-range-filter-input-group">
          <label htmlFor="date-range-start" className="date-range-filter-label">
            Start Date
          </label>
          <input
            id="date-range-start"
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            className="date-range-filter-input"
            aria-label="Start date for filtering"
            max={endDate || undefined}
          />
        </div>
        <div className="date-range-filter-input-group">
          <label htmlFor="date-range-end" className="date-range-filter-label">
            End Date
          </label>
          <input
            id="date-range-end"
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            className="date-range-filter-input"
            aria-label="End date for filtering"
            min={startDate || undefined}
          />
        </div>
      </div>
      {(startDate || endDate) && (
        <button
          type="button"
          onClick={handleClear}
          className="date-range-filter-clear"
          aria-label="Clear date range filter"
        >
          Clear
        </button>
      )}
    </div>
  );
}

export default DateRangeFilter;
