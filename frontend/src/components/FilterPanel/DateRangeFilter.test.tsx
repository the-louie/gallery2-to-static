/**
 * DateRangeFilter Component Tests
 *
 * Comprehensive tests for the DateRangeFilter component covering rendering,
 * user interactions, date validation, and accessibility.
 *
 * @module frontend/src/components/FilterPanel
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { DateRangeFilter } from './DateRangeFilter';
import { DATE_RANGE_OPEN_START, DATE_RANGE_OPEN_END } from '@/utils/dateRange';
import { FilterProvider } from '@/contexts/FilterContext';
import type { FilterCriteria } from '@/types';

// Helper to render with FilterProvider
function renderWithProvider(
  ui: React.ReactElement,
  initialCriteria?: FilterCriteria
) {
  return render(
    <FilterProvider defaultCriteria={initialCriteria || {}}>{ui}</FilterProvider>
  );
}

describe('DateRangeFilter', () => {
  const mockOnCriteriaChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders date range filter with start and end date inputs', () => {
      renderWithProvider(
        <DateRangeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    });

    it('renders with existing date range values', () => {
      const criteria: FilterCriteria = {
        dateRange: {
          start: new Date('2024-01-01').getTime(),
          end: new Date('2024-12-31').getTime(),
        },
      };

      renderWithProvider(
        <DateRangeFilter criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      const startInput = screen.getByLabelText('Start Date') as HTMLInputElement;
      const endInput = screen.getByLabelText('End Date') as HTMLInputElement;

      expect(startInput.value).toBe('2024-01-01');
      expect(endInput.value).toBe('2024-12-31');
    });

    it('does not render clear button when no dates are set', () => {
      renderWithProvider(
        <DateRangeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      expect(screen.queryByLabelText('Clear date range filter')).not.toBeInTheDocument();
    });

    it('renders clear button when dates are set', () => {
      const criteria: FilterCriteria = {
        dateRange: {
          start: new Date('2024-01-01').getTime(),
          end: new Date('2024-12-31').getTime(),
        },
      };

      renderWithProvider(
        <DateRangeFilter criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      expect(screen.getByLabelText('Clear date range filter')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    // Local-day helpers: the inputs are local dates; the range is local start/end of day in ms (LOGIC-18).
    const startOf = (d: string) => {
      const [y, m, dd] = d.split('-').map(Number);
      return new Date(y, m - 1, dd).getTime();
    };
    const endOf = (d: string) => {
      const [y, m, dd] = d.split('-').map(Number);
      return new Date(y, m - 1, dd + 1).getTime() - 1;
    };
    const lastRange = () =>
      (mockOnCriteriaChange.mock.calls[mockOnCriteriaChange.mock.calls.length - 1][0] as FilterCriteria).dateRange;

    it('changes the start date of an existing range', () => {
      const criteria: FilterCriteria = { dateRange: { start: startOf('2024-01-01'), end: endOf('2024-12-31') } };
      renderWithProvider(<DateRangeFilter criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />);
      fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2024-06-01' } });
      expect(lastRange()).toEqual({ start: startOf('2024-06-01'), end: endOf('2024-12-31') });
    });

    it('only a start date gives an open-ended range, and the input keeps its value', () => {
      renderWithProvider(<DateRangeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />);
      const startInput = screen.getByLabelText('Start Date') as HTMLInputElement;
      fireEvent.change(startInput, { target: { value: '2024-06-01' } });
      expect(lastRange()).toEqual({ start: startOf('2024-06-01'), end: DATE_RANGE_OPEN_END });
      expect(startInput.value).toBe('2024-06-01');
    });

    it('only an end date gives a range up to the end of that day', () => {
      renderWithProvider(<DateRangeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />);
      fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2024-12-31' } });
      expect(lastRange()).toEqual({ start: DATE_RANGE_OPEN_START, end: endOf('2024-12-31') });
    });

    it('entering one date then the other creates the full range, end day inclusive', () => {
      renderWithProvider(<DateRangeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />);
      fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2024-01-01' } });
      fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2024-06-30' } });
      expect(lastRange()).toEqual({ start: startOf('2024-01-01'), end: endOf('2024-06-30') });
      // a photo taken at 18:00 on the end date (Unix seconds) is inside the range
      const evening = new Date(2024, 5, 30, 18).getTime();
      expect(evening).toBeLessThanOrEqual(lastRange()!.end);
    });

    it('clears dateRange when clear button is clicked', async () => {
      const user = userEvent.setup();
      const criteria: FilterCriteria = {
        dateRange: {
          start: new Date('2024-01-01').getTime(),
          end: new Date('2024-12-31').getTime(),
        },
      };

      renderWithProvider(
        <DateRangeFilter criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      const clearButton = screen.getByLabelText('Clear date range filter');
      await user.click(clearButton);

      expect(mockOnCriteriaChange).toHaveBeenCalled();
      const callArgs = mockOnCriteriaChange.mock.calls[0][0];
      expect(callArgs.dateRange).toBeUndefined();
    });

    it('uses dates entered the wrong way round as a range', () => {
      renderWithProvider(<DateRangeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />);
      fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2024-06-30' } });
      fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2024-12-01' } });
      expect(lastRange()).toEqual({ start: startOf('2024-06-30'), end: endOf('2024-12-01') });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithProvider(
        <DateRangeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      expect(screen.getByRole('group', { name: 'Date range filter' })).toBeInTheDocument();
      expect(screen.getByLabelText('Start date for filtering')).toBeInTheDocument();
      expect(screen.getByLabelText('End date for filtering')).toBeInTheDocument();
    });

    it('has proper label associations', () => {
      renderWithProvider(
        <DateRangeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      const startLabel = screen.getByText('Start Date');
      const startInput = screen.getByLabelText('Start Date');
      expect(startLabel).toHaveAttribute('for', 'date-range-start');
      expect(startInput).toHaveAttribute('id', 'date-range-start');

      const endLabel = screen.getByText('End Date');
      const endInput = screen.getByLabelText('End Date');
      expect(endLabel).toHaveAttribute('for', 'date-range-end');
      expect(endInput).toHaveAttribute('id', 'date-range-end');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <DateRangeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      const startInput = screen.getByLabelText('Start Date');
      await user.tab();
      expect(startInput).toHaveFocus();

      await user.tab();
      const endInput = screen.getByLabelText('End Date');
      expect(endInput).toHaveFocus();
    });
  });
});
