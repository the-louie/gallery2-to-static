/**
 * TypeFilter Component Tests
 *
 * Comprehensive tests for the TypeFilter component covering rendering,
 * user interactions, and accessibility.
 *
 * @module frontend/src/components/FilterPanel
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { TypeFilter } from './TypeFilter';
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

describe('TypeFilter', () => {
  const mockOnCriteriaChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders type filter with radio buttons', () => {
      renderWithProvider(
        <TypeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      expect(screen.getByRole('radiogroup', { name: 'Type filter' })).toBeInTheDocument();
      expect(screen.getByLabelText('All')).toBeInTheDocument();
      expect(screen.getByLabelText('Albums Only')).toBeInTheDocument();
      expect(screen.getByLabelText('Images Only')).toBeInTheDocument();
    });

    it('has "All" selected by default', () => {
      renderWithProvider(
        <TypeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      const allRadio = screen.getByLabelText('All') as HTMLInputElement;
      expect(allRadio.checked).toBe(true);
    });

    it('renders with existing type filter value', () => {
      const criteria: FilterCriteria = {
        albumType: 'GalleryPhotoItem',
      };

      renderWithProvider(
        <TypeFilter criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      const imagesRadio = screen.getByLabelText('Images Only') as HTMLInputElement;
      expect(imagesRadio.checked).toBe(true);
    });
  });

  describe('User Interactions', () => {
    it('calls onCriteriaChange when type is changed to Albums Only', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <TypeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      const albumsRadio = screen.getByLabelText('Albums Only');
      await user.click(albumsRadio);

      expect(mockOnCriteriaChange).toHaveBeenCalled();
      const callArgs = mockOnCriteriaChange.mock.calls[0][0];
      expect(callArgs.albumType).toBe('GalleryAlbumItem');
    });

    it('calls onCriteriaChange when type is changed to Images Only', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <TypeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      const imagesRadio = screen.getByLabelText('Images Only');
      await user.click(imagesRadio);

      expect(mockOnCriteriaChange).toHaveBeenCalled();
      const callArgs = mockOnCriteriaChange.mock.calls[0][0];
      expect(callArgs.albumType).toBe('GalleryPhotoItem');
    });

    it('calls onCriteriaChange with undefined when All is selected', async () => {
      const user = userEvent.setup();
      const criteria: FilterCriteria = {
        albumType: 'GalleryPhotoItem',
      };

      renderWithProvider(
        <TypeFilter criteria={criteria} onCriteriaChange={mockOnCriteriaChange} />
      );

      const allRadio = screen.getByLabelText('All');
      await user.click(allRadio);

      expect(mockOnCriteriaChange).toHaveBeenCalled();
      const callArgs = mockOnCriteriaChange.mock.calls[0][0];
      expect(callArgs.albumType).toBeUndefined();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProvider(
        <TypeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      expect(screen.getByRole('radiogroup', { name: 'Type filter' })).toBeInTheDocument();
      expect(screen.getByText('Filter by Type')).toBeInTheDocument();
    });

    it('has proper label associations', () => {
      renderWithProvider(
        <TypeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      const allLabel = screen.getByLabelText('All');
      expect(allLabel).toHaveAttribute('id', 'type-filter-all');

      const albumsLabel = screen.getByLabelText('Albums Only');
      expect(albumsLabel).toHaveAttribute('id', 'type-filter-albums');

      const imagesLabel = screen.getByLabelText('Images Only');
      expect(imagesLabel).toHaveAttribute('id', 'type-filter-images');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithProvider(
        <TypeFilter criteria={{}} onCriteriaChange={mockOnCriteriaChange} />
      );

      const allRadio = screen.getByLabelText('All') as HTMLInputElement;
      await user.tab();
      expect(allRadio).toHaveFocus();

      await user.keyboard('{ArrowDown}');
      const albumsRadio = screen.getByLabelText('Albums Only') as HTMLInputElement;
      expect(albumsRadio).toHaveFocus();
    });
  });
});
