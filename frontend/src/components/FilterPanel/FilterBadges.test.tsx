/**
 * FilterBadges Component Tests
 *
 * Comprehensive tests for the FilterBadges component covering rendering,
 * badge display, removal, and accessibility.
 *
 * @module frontend/src/components/FilterPanel
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { FilterBadges } from './FilterBadges';
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

describe('FilterBadges', () => {
  const mockOnCriteriaChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders empty div when no filters are active', () => {
      const { container } = renderWithProvider(
        <FilterBadges criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      const badgesContainer = container.querySelector('.filter-badges');
      expect(badgesContainer).toBeInTheDocument();
      expect(screen.queryByText(/filter.*active/i)).not.toBeInTheDocument();
    });

    it('renders active filter count when filters are active', () => {
      const criteria: FilterCriteria = {
        dateRange: {
          start: new Date('2024-01-01').getTime(),
          end: new Date('2024-12-31').getTime(),
        },
      };

      renderWithProvider(
        <FilterBadges criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      expect(screen.getByText(/1 filter active/i)).toBeInTheDocument();
    });

    it('renders plural count when multiple filters are active', () => {
      const criteria: FilterCriteria = {
        dateRange: {
          start: new Date('2024-01-01').getTime(),
          end: new Date('2024-12-31').getTime(),
        },
        albumType: 'GalleryPhotoItem',
      };

      renderWithProvider(
        <FilterBadges criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      expect(screen.getByText(/2 filters active/i)).toBeInTheDocument();
    });

    it('renders date range badge when date range filter is active', () => {
      const criteria: FilterCriteria = {
        dateRange: {
          start: new Date('2024-01-01').getTime(),
          end: new Date('2024-12-31').getTime(),
        },
      };

      renderWithProvider(
        <FilterBadges criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      expect(screen.getByText(/Date:/i)).toBeInTheDocument();
    });

    it('renders type badge when type filter is active', () => {
      const criteria: FilterCriteria = {
        albumType: 'GalleryPhotoItem',
      };

      renderWithProvider(
        <FilterBadges criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      expect(screen.getByText(/Type: Images Only/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onCriteriaChange when date range badge is removed', async () => {
      const user = userEvent.setup();
      const criteria: FilterCriteria = {
        dateRange: {
          start: new Date('2024-01-01').getTime(),
          end: new Date('2024-12-31').getTime(),
        },
      };

      renderWithProvider(
        <FilterBadges criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      const removeButton = screen.getByLabelText('Remove date range filter');
      await user.click(removeButton);

      expect(mockOnCriteriaChange).toHaveBeenCalled();
      const callArgs = mockOnCriteriaChange.mock.calls[0][0];
      expect(callArgs.dateRange).toBeUndefined();
    });

    it('calls onCriteriaChange when type badge is removed', async () => {
      const user = userEvent.setup();
      const criteria: FilterCriteria = {
        albumType: 'GalleryPhotoItem',
      };

      renderWithProvider(
        <FilterBadges criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      const removeButton = screen.getByLabelText('Remove type filter');
      await user.click(removeButton);

      expect(mockOnCriteriaChange).toHaveBeenCalled();
      const callArgs = mockOnCriteriaChange.mock.calls[0][0];
      expect(callArgs.albumType).toBeUndefined();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const criteria: FilterCriteria = {
        dateRange: {
          start: new Date('2024-01-01').getTime(),
          end: new Date('2024-12-31').getTime(),
        },
      };

      renderWithProvider(
        <FilterBadges criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      expect(screen.getByRole('group', { name: 'Active filters' })).toBeInTheDocument();
      expect(screen.getByLabelText('Remove date range filter')).toBeInTheDocument();
    });

    it('has proper list structure', () => {
      const criteria: FilterCriteria = {
        dateRange: {
          start: new Date('2024-01-01').getTime(),
          end: new Date('2024-12-31').getTime(),
        },
        albumType: 'GalleryPhotoItem',
      };

      renderWithProvider(
        <FilterBadges criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(2);
    });
  });
});
