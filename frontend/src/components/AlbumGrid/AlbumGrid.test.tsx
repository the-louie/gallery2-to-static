/**
 * AlbumGrid Component Tests
 *
 * Comprehensive tests for the AlbumGrid component covering rendering,
 * data loading, filtering, states, and integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { AlbumGrid } from './AlbumGrid';
import { mockAlbums, mockChildren, mockEmptyChildren } from '@/__mocks__/mockData';
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
    option: 'order-asc' as const,
    setOption: vi.fn(),
  })),
}));

// Mock react-virtuoso VirtuosoGrid (used by VirtualGrid)
vi.mock('react-virtuoso', () => ({
  VirtuosoGrid: ({ data, itemContent, ...props }: any) => (
    <div data-testid="virtuoso-grid-container" {...props}>
      {(data || []).map((item: any, index: number) => (
        <div key={index} data-item-index={index}>
          {itemContent(index, item, undefined)}
        </div>
      ))}
    </div>
  ),
}));

describe('AlbumGrid', () => {
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

  describe('Component Rendering with Albums Prop', () => {
    it('renders albums from props', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albums={mockAlbums} />);
      expect(screen.getByText('Test Album')).toBeInTheDocument();
      expect(screen.getByText('Parent Album')).toBeInTheDocument();
    });

    it('renders loading state when isLoading prop is true', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albums={[]} isLoading={true} />);
      expect(screen.getByLabelText('Loading albums')).toBeInTheDocument();
    });

    it('renders empty state when albums array is empty', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albums={[]} />);
      expect(screen.getByText('No albums found')).toBeInTheDocument();
    });
  });

  describe('Data Loading Integration', () => {
    it('loads data using useAlbumData when albumId is provided', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albumId={7} />);
      expect(mockUseAlbumData).toHaveBeenCalledWith(7);
    });

    it('filters albums from loaded data', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albumId={7} />);
      // Should only show albums, not photos
      expect(screen.getByText('Test Album')).toBeInTheDocument();
      expect(screen.queryByText('Test Photo')).not.toBeInTheDocument();
    });

    it('renders loading state from hook', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albumId={7} />);
      expect(screen.getByLabelText('Loading albums')).toBeInTheDocument();
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
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albumId={7} />);
      expect(screen.getByText(/Error loading albums/)).toBeInTheDocument();
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });

    it('handles empty data from hook', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockEmptyChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albumId={7} />);
      expect(screen.getByText('No albums found')).toBeInTheDocument();
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
        metadata: null,
        refetch: mockRefetch,
      });

      const user = userEvent.setup();
      render(<AlbumGrid albumId={7} />);

      const retryButton = screen.getByLabelText('Retry loading albums');
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Album Click Handling', () => {
    it('calls onAlbumClick when album is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albums={mockAlbums} onAlbumClick={handleClick} />);

      const albumCard = screen.getByText('Test Album').closest('article');
      if (albumCard) {
        await user.click(albumCard);
        expect(handleClick).toHaveBeenCalledWith(mockAlbums[0]);
      }
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albums={mockAlbums} />);
      const grid = screen.getByRole('region', { name: 'Album grid' });
      expect(grid).toBeInTheDocument();
    });

    it('has aria-busy during loading', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albumId={7} />);
      // Loading state is shown via skeleton, but grid itself should not be busy
      expect(screen.getByLabelText('Loading albums')).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('handles null albumId gracefully', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albumId={null} />);
      expect(mockUseAlbumData).toHaveBeenCalledWith(null);
    });

    it('prioritizes albums prop over loaded data', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albums={mockAlbums} albumId={7} />);
      // Should show albums from prop, not from loaded data
      expect(screen.getByText('Test Album')).toBeInTheDocument();
      expect(screen.getByText('Parent Album')).toBeInTheDocument();
    });

    it('handles mixed data with albums and photos', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumGrid albumId={7} />);
      // Should only show albums
      expect(screen.getByText('Test Album')).toBeInTheDocument();
      expect(screen.queryByText('Test Photo')).not.toBeInTheDocument();
    });
  });

  describe('Filter Integration', () => {
    it('applies date range filter to albums', () => {
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

      const albumsWithDates = [
        {
          ...mockAlbums[0],
          timestamp: new Date('2024-06-15').getTime(),
        },
        {
          ...mockAlbums[0],
          id: 99,
          timestamp: new Date('2025-06-15').getTime(),
        },
      ];

      mockUseAlbumData.mockReturnValue({
        data: albumsWithDates,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(
        <FilterProvider defaultCriteria={criteria}>
          <AlbumGrid albumId={7} />
        </FilterProvider>
      );

      // Should only show album within date range
      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    it('applies type filter to albums', () => {
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
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(
        <FilterProvider defaultCriteria={criteria}>
          <AlbumGrid albumId={7} />
        </FilterProvider>
      );

      // Should only show albums
      expect(screen.getByText('Test Album')).toBeInTheDocument();
      expect(screen.queryByText('Test Photo')).not.toBeInTheDocument();
    });

    it('applies combined filters (date range + type)', () => {
      const criteria: FilterCriteria = {
        dateRange: {
          start: new Date('2024-01-01').getTime(),
          end: new Date('2024-12-31').getTime(),
        },
        albumType: 'GalleryAlbumItem',
      };

      mockUseFilter.mockReturnValue({
        criteria,
        setCriteria: vi.fn(),
        clearFilters: vi.fn(),
        hasActiveFilters: vi.fn(() => true),
      });

      const albumsWithDates = [
        {
          ...mockAlbums[0],
          timestamp: new Date('2024-06-15').getTime(),
        },
      ];

      mockUseAlbumData.mockReturnValue({
        data: albumsWithDates,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(
        <FilterProvider defaultCriteria={criteria}>
          <AlbumGrid albumId={7} />
        </FilterProvider>
      );

      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    it('shows empty state when filters result in no albums', () => {
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
        data: mockAlbums,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(
        <FilterProvider defaultCriteria={criteria}>
          <AlbumGrid albumId={7} />
        </FilterProvider>
      );

      expect(screen.getByText('No albums found')).toBeInTheDocument();
    });
  });
});
