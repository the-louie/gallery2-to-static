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
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { DateRangeFilter } from './DateRangeFilter';
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
    it('calls onCriteriaChange when start date is set and end date exists', async () => {
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

      const startInput = screen.getByLabelText('Start Date');
      await user.clear(startInput);
      await user.type(startInput, '2024-06-01');

      expect(mockOnCriteriaChange).toHaveBeenCalled();
      const callArgs = mockOnCriteriaChange.mock.calls[0][0];
      expect(callArgs.dateRange).toBeDefined();
      expect(callArgs.dateRange?.start).toBe(new Date('2024-06-01').getTime());
    });

    it('does not create dateRange when only start date is set', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <DateRangeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      const startInput = screen.getByLabelText('Start Date');
      await user.type(startInput, '2024-06-01');

      expect(mockOnCriteriaChange).toHaveBeenCalled();
      const callArgs = mockOnCriteriaChange.mock.calls[0][0];
      expect(callArgs.dateRange).toBeUndefined();
    });

    it('does not create dateRange when only end date is set', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <DateRangeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      const endInput = screen.getByLabelText('End Date');
      await user.type(endInput, '2024-12-31');

      expect(mockOnCriteriaChange).toHaveBeenCalled();
      const callArgs = mockOnCriteriaChange.mock.calls[0][0];
      expect(callArgs.dateRange).toBeUndefined();
    });

    it('creates dateRange when both dates are set', async () => {
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

      const endInput = screen.getByLabelText('End Date');
      await user.clear(endInput);
      await user.type(endInput, '2024-06-30');

      expect(mockOnCriteriaChange).toHaveBeenCalled();
      const callArgs = mockOnCriteriaChange.mock.calls[0][0];
      expect(callArgs.dateRange).toBeDefined();
      expect(callArgs.dateRange?.start).toBe(new Date('2024-01-01').getTime());
      expect(callArgs.dateRange?.end).toBe(new Date('2024-06-30').getTime());
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

    it('adjusts end date when start date is after end date', async () => {
      const user = userEvent.setup();
      const criteria: FilterCriteria = {
        dateRange: {
          start: new Date('2024-01-01').getTime(),
          end: new Date('2024-06-30').getTime(),
        },
      };

      renderWithProvider(
        <DateRangeFilter criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      const startInput = screen.getByLabelText('Start Date');
      await user.clear(startInput);
      await user.type(startInput, '2024-12-01');

      expect(mockOnCriteriaChange).toHaveBeenCalled();
      const callArgs = mockOnCriteriaChange.mock.calls[0][0];
      expect(callArgs.dateRange).toBeDefined();
      expect(callArgs.dateRange?.start).toBe(new Date('2024-12-01').getTime());
      expect(callArgs.dateRange?.end).toBeGreaterThan(callArgs.dateRange.start);
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
