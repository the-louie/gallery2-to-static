/**
 * ImageGrid Component Tests
 *
 * Comprehensive tests for the ImageGrid component covering rendering,
 * data loading, filtering, states, and integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { ImageGrid } from './ImageGrid';
import { mockPhotos, mockChildren, mockEmptyChildren } from '@/__mocks__/mockData';
import * as useAlbumDataHook from '@/hooks/useAlbumData';
import * as useFilterHook from '@/contexts/FilterContext';
import { FilterProvider } from '@/contexts/FilterContext';
import type { FilterCriteria } from '@/types';

// Mock the useAlbumData hook
vi.mock('@/hooks/useAlbumData', () => ({
  useAlbumData: vi.fn(),
}));

// Mock the useScrollPosition hook
vi.mock('@/hooks/useScrollPosition', () => ({
  useScrollPosition: vi.fn(() => ({
    scrollTop: 0,
    setScrollTop: vi.fn(),
    saveScrollPosition: vi.fn(),
    clearScrollPosition: vi.fn(),
  })),
}));

// Mock the useFilter hook
vi.mock('@/contexts/FilterContext', () => ({
  useFilter: vi.fn(() => ({
    criteria: {},
    setCriteria: vi.fn(),
    clearFilters: vi.fn(),
    hasActiveFilters: vi.fn(() => false),
  })),
  FilterProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the useSort hook
vi.mock('@/hooks/useSort', () => ({
  useSort: vi.fn(() => ({
    option: 'date-desc' as const,
    setOption: vi.fn(),
  })),
}));

// Mock react-virtuoso
vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ itemContent, totalCount, ...props }: any) => {
    const items = Array.from({ length: totalCount }, (_, i) => i);
    return (
      <div data-testid="virtuoso-container" {...props}>
        {items.map((index) => (
          <div key={index} data-item-index={index}>
            {itemContent(index)}
          </div>
        ))}
      </div>
    );
  },
}));

describe('ImageGrid', () => {
  const mockUseAlbumData = vi.mocked(useAlbumDataHook.useAlbumData);
  const mockUseFilter = vi.mocked(useFilterHook.useFilter);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default filter state (no active filters)
    mockUseFilter.mockReturnValue({
      criteria: {},
      setCriteria: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: vi.fn(() => false),
    });
  });

  describe('Component Rendering with Images Prop', () => {
    it('renders images from props', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ImageGrid images={mockPhotos} />);
      expect(screen.getByAltText('Test Photo')).toBeInTheDocument();
      expect(screen.getByAltText('Portrait Photo')).toBeInTheDocument();
    });

    it('renders loading state when isLoading prop is true', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ImageGrid images={[]} isLoading={true} />);
      expect(screen.getByLabelText('Loading images')).toBeInTheDocument();
    });

    it('renders empty state when images array is empty', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ImageGrid images={[]} />);
      expect(screen.getByText('No images found')).toBeInTheDocument();
    });
  });

  describe('Data Loading Integration', () => {
    it('loads data using useAlbumData when albumId is provided', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ImageGrid albumId={7} />);
      expect(mockUseAlbumData).toHaveBeenCalledWith(7);
    });

    it('filters images from loaded data', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ImageGrid albumId={7} />);
      // Should only show images, not albums
      expect(screen.getByAltText('Test Photo')).toBeInTheDocument();
      // Albums don't render as images, so we check that no album title appears
      expect(screen.queryByText('Test Album')).not.toBeInTheDocument();
    });

    it('renders loading state from hook', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<ImageGrid albumId={7} />);
      expect(screen.getByLabelText('Loading images')).toBeInTheDocument();
    });

    it('renders error state from hook', () => {
      const mockError = {
        message: 'Failed to load',
        code: 'NETWORK_ERROR',
        cause: new Error('Network error'),
      };

      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        refetch: vi.fn(),
      });

      render(<ImageGrid albumId={7} />);
      expect(screen.getByText(/Error loading images/)).toBeInTheDocument();
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });

    it('handles empty data from hook', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockEmptyChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ImageGrid albumId={7} />);
      expect(screen.getByText('No images found')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays retry button on error', async () => {
      const mockRefetch = vi.fn();
      const mockError = {
        message: 'Failed to load',
        code: 'NETWORK_ERROR',
        cause: new Error('Network error'),
      };

      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      });

      const user = userEvent.setup();
      render(<ImageGrid albumId={7} />);

      const retryButton = screen.getByLabelText('Retry loading images');
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Image Click Handling', () => {
    it('calls onImageClick when image is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ImageGrid images={mockPhotos} onImageClick={handleClick} />);

      const imageThumbnail = screen.getByRole('button', { name: 'Test Photo' });
      await user.click(imageThumbnail);
      expect(handleClick).toHaveBeenCalledWith(mockPhotos[0]);
    });
  });

  describe('View Mode', () => {
    it('applies grid view mode class', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <ImageGrid images={mockPhotos} viewMode="grid" />,
      );
      const grid = container.querySelector('.image-grid');
      expect(grid).toHaveClass('image-grid-grid');
    });

    it('applies list view mode class', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <ImageGrid images={mockPhotos} viewMode="list" />,
      );
      const grid = container.querySelector('.image-grid');
      expect(grid).toHaveClass('image-grid-list');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ImageGrid images={mockPhotos} />);
      const grid = screen.getByRole('region', { name: 'Image grid' });
      expect(grid).toBeInTheDocument();
    });

    it('has aria-busy during loading', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<ImageGrid albumId={7} />);
      // Loading state is shown via skeleton, but grid itself should not be busy
      expect(screen.getByLabelText('Loading images')).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('handles null albumId gracefully', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ImageGrid albumId={null} />);
      expect(mockUseAlbumData).toHaveBeenCalledWith(null);
    });

    it('prioritizes images prop over loaded data', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ImageGrid images={mockPhotos} albumId={7} />);
      // Should show images from prop, not from loaded data
      expect(screen.getByAltText('Test Photo')).toBeInTheDocument();
      expect(screen.getByAltText('Portrait Photo')).toBeInTheDocument();
    });

    it('handles mixed data with albums and photos', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ImageGrid albumId={7} />);
      // Should only show images
      expect(screen.getByAltText('Test Photo')).toBeInTheDocument();
      expect(screen.queryByText('Test Album')).not.toBeInTheDocument();
    });
  });

  describe('Filter Integration', () => {
    it('applies date range filter to images', () => {
      const criteria: FilterCriteria = {
        dateRange: {
          start: new Date('2024-01-01').getTime(),
          end: new Date('2024-12-31').getTime(),
        },
      };

      mockUseFilter.mockReturnValue({
        criteria,
        setCriteria: vi.fn(),
        clearFilters: vi.fn(),
        hasActiveFilters: vi.fn(() => true),
      });

      const imagesWithDates = [
        {
          ...mockPhotos[0],
          timestamp: new Date('2024-06-15').getTime(),
        },
        {
          ...mockPhotos[0],
          id: 99,
          timestamp: new Date('2025-06-15').getTime(),
        },
      ];

      mockUseAlbumData.mockReturnValue({
        data: imagesWithDates,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <FilterProvider defaultCriteria={criteria}>
          <ImageGrid albumId={7} />
        </FilterProvider>
      );

      // Should only show image within date range
      expect(screen.getByText('Test Photo')).toBeInTheDocument();
    });

    it('applies type filter to images', () => {
      const criteria: FilterCriteria = {
        albumType: 'GalleryPhotoItem',
      };

      mockUseFilter.mockReturnValue({
        criteria,
        setCriteria: vi.fn(),
        clearFilters: vi.fn(),
        hasActiveFilters: vi.fn(() => true),
      });

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <FilterProvider defaultCriteria={criteria}>
          <ImageGrid albumId={7} />
        </FilterProvider>
      );

      // Should only show images
      expect(screen.getByText('Test Photo')).toBeInTheDocument();
      expect(screen.queryByText('Test Album')).not.toBeInTheDocument();
    });

    it('shows empty state when filters result in no images', () => {
      const criteria: FilterCriteria = {
        albumType: 'GalleryAlbumItem',
      };

      mockUseFilter.mockReturnValue({
        criteria,
        setCriteria: vi.fn(),
        clearFilters: vi.fn(),
        hasActiveFilters: vi.fn(() => true),
      });

      mockUseAlbumData.mockReturnValue({
        data: mockPhotos,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <FilterProvider defaultCriteria={criteria}>
          <ImageGrid albumId={7} />
        </FilterProvider>
      );

      expect(screen.getByText('No images found')).toBeInTheDocument();
    });
  });
});
