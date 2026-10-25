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

import React, { useCallback, useState } from 'react';
import type { FilterCriteria } from '@/types';
import { DATE_RANGE_OPEN_START, DATE_RANGE_OPEN_END, dateInputsToRange } from '@/utils/dateRange';
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
  // The inputs keep their own values, so a single date stays entered while the other is still
  // empty (LOGIC-18: they were derived from criteria.dateRange, which was only set with both).
  const rangeStart = criteria.dateRange?.start;
  const rangeEnd = criteria.dateRange?.end;
  const [startDate, setStartDate] = useState(() =>
    rangeStart != null && rangeStart !== DATE_RANGE_OPEN_START ? timestampToDateString(rangeStart) : '',
  );
  const [endDate, setEndDate] = useState(() =>
    rangeEnd != null && rangeEnd !== DATE_RANGE_OPEN_END ? timestampToDateString(rangeEnd) : '',
  );

  // Follow outside changes (clear button, filter badges): adjusted during render when the range
  // changes to none (was an effect, one render late; REFAC-01)
  const rangeKey = `${rangeStart ?? ''}-${rangeEnd ?? ''}`;
  const [seenRangeKey, setSeenRangeKey] = useState(rangeKey);
  if (seenRangeKey !== rangeKey) {
    setSeenRangeKey(rangeKey);
    if (rangeStart == null && rangeEnd == null) {
      setStartDate('');
      setEndDate('');
    }
  }

  const apply = useCallback(
    (nextStart: string, nextEnd: string) => {
      onCriteriaChange({ ...criteria, dateRange: dateInputsToRange(nextStart, nextEnd) });
    },
    [criteria, onCriteriaChange],
  );

  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setStartDate(e.target.value);
      apply(e.target.value, endDate);
    },
    [apply, endDate],
  );

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEndDate(e.target.value);
      apply(startDate, e.target.value);
    },
    [apply, startDate],
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
