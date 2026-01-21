/**
 * AlbumDetail Component Tests
 *
 * Comprehensive tests for the AlbumDetail component covering rendering,
 * data loading, navigation, states, and integration.
 *
 * @module frontend/src/components/AlbumDetail
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { AlbumDetail } from './AlbumDetail';
import { mockChildren, mockAlbum } from '@/__mocks__/mockData';
import * as useAlbumDataHook from '@/hooks/useAlbumData';
import * as useFilterHook from '@/contexts/FilterContext';
import { FilterProvider } from '@/contexts/FilterContext';
import { DataLoadError } from '@/utils/dataLoader';
import type { Album, FilterCriteria } from '@/types';

// Mock the useAlbumData hook
vi.mock('@/hooks/useAlbumData', () => ({
  useAlbumData: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
  useSort: vi.fn((context: 'albums' | 'images') => ({
    option: 'date-desc' as const,
    setOption: vi.fn(),
  })),
}));

describe('AlbumDetail', () => {
  const mockUseAlbumData = vi.mocked(useAlbumDataHook.useAlbumData);
  const mockUseFilter = vi.mocked(useFilterHook.useFilter);

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    // Default filter state (no active filters)
    mockUseFilter.mockReturnValue({
      criteria: {},
      setCriteria: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: vi.fn(() => false),
    });
  });

  describe('Component Rendering', () => {
    it('renders with required props', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByText('Albums')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
    });

    it('renders with album metadata prop', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const album: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
      } as Album;

      render(<AlbumDetail albumId={7} album={album} />);
      expect(screen.getByText('Test Album')).toBeInTheDocument();
      expect(
        screen.getByText('Test album for JSON import verification'),
      ).toBeInTheDocument();
    });

    it('renders back button by default', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByLabelText('Go back')).toBeInTheDocument();
    });

    it('hides back button when showBackButton is false', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} showBackButton={false} />);
      expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
    });

    it('hides title when showTitle is false', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const album: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
      } as Album;

      render(<AlbumDetail albumId={7} album={album} showTitle={false} />);
      expect(screen.queryByText('Test Album')).not.toBeInTheDocument();
    });

    it('hides description when showDescription is false', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const album: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
      } as Album;

      render(
        <AlbumDetail albumId={7} album={album} showDescription={false} />,
      );
      expect(
        screen.queryByText('Test album for JSON import verification'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('loads data using useAlbumData hook', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(mockUseAlbumData).toHaveBeenCalledWith(7);
    });

    it('displays loading state', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByLabelText('Loading albums')).toBeInTheDocument();
    });

    it('displays error state', () => {
      const error = new DataLoadError('Failed to load', 'NETWORK_ERROR');

      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByText(/Error Loading Album/i)).toBeInTheDocument();
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });

    it('displays empty state when no children', () => {
      mockUseAlbumData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByText(/Empty Album/i)).toBeInTheDocument();
    });
  });

  describe('Child Albums and Images Display', () => {
    it('displays child albums', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByText('Albums')).toBeInTheDocument();
      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    it('displays child images', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByText('Images')).toBeInTheDocument();
    });

    it('displays only albums section when no images', () => {
      const albumsOnly = mockChildren.filter(
        (child) => child.type === 'GalleryAlbumItem',
      );

      mockUseAlbumData.mockReturnValue({
        data: albumsOnly,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByText('Albums')).toBeInTheDocument();
      expect(screen.queryByText('Images')).not.toBeInTheDocument();
    });

    it('displays only images section when no albums', () => {
      const imagesOnly = mockChildren.filter(
        (child) => child.type === 'GalleryPhotoItem',
      );

      mockUseAlbumData.mockReturnValue({
        data: imagesOnly,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.queryByText('Albums')).not.toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to album when album is clicked', async () => {
      const user = userEvent.setup();

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);

      await waitFor(() => {
        expect(screen.getByText('Test Album')).toBeInTheDocument();
      });

      const albumCard = screen.getByText('Test Album').closest('article');
      if (albumCard) {
        await user.click(albumCard);
        expect(mockNavigate).toHaveBeenCalledWith('/album/1');
      }
    });

    it('calls custom onAlbumClick handler when provided', async () => {
      const user = userEvent.setup();
      const handleAlbumClick = vi.fn();

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <AlbumDetail albumId={7} onAlbumClick={handleAlbumClick} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Test Album')).toBeInTheDocument();
      });

      const albumCard = screen.getByText('Test Album').closest('article');
      if (albumCard) {
        await user.click(albumCard);
        expect(handleAlbumClick).toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
      }
    });

    it('navigates back when back button is clicked', async () => {
      const user = userEvent.setup();

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);

      const backButton = screen.getByLabelText('Go back');
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('calls custom onBackClick handler when provided', async () => {
      const user = userEvent.setup();
      const handleBackClick = vi.fn();

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} onBackClick={handleBackClick} />);

      const backButton = screen.getByLabelText('Go back');
      await user.click(backButton);

      expect(handleBackClick).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays retry button on error', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      const error = new DataLoadError('Failed to load', 'NETWORK_ERROR');

      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error,
        refetch: mockRefetch,
      });

      render(<AlbumDetail albumId={7} />);

      const retryButton = screen.getByLabelText('Retry loading album');
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('displays home button on NOT_FOUND error', () => {
      const error = new DataLoadError('Album not found', 'NOT_FOUND');

      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByLabelText('Go to home page')).toBeInTheDocument();
    });

    it('navigates to home when home button is clicked on NOT_FOUND error', async () => {
      const user = userEvent.setup();
      const error = new DataLoadError('Album not found', 'NOT_FOUND');

      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);

      const homeButton = screen.getByLabelText('Go to home page');
      await user.click(homeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Breadcrumbs Integration', () => {
    it('renders breadcrumbs when provided', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const breadcrumbs = <nav>Home / Albums / Test</nav>;

      render(<AlbumDetail albumId={7} breadcrumbs={breadcrumbs} />);
      expect(screen.getByText('Home / Albums / Test')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for sections', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(
        screen.getByRole('region', { name: 'Child albums' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Images' })).toBeInTheDocument();
    });

    it('has accessible back button', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      const backButton = screen.getByLabelText('Go back');
      expect(backButton).toBeInTheDocument();
      expect(backButton.tagName).toBe('BUTTON');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing album metadata gracefully', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      // Should still render children even without metadata
      expect(screen.getByText('Albums')).toBeInTheDocument();
    });

    it('handles empty title gracefully', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const albumWithoutTitle: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        title: '',
      } as Album;

      render(<AlbumDetail albumId={7} album={albumWithoutTitle} />);
      // Should not crash, title section should not render
      expect(screen.getByText('Albums')).toBeInTheDocument();
    });

    it('handles empty description gracefully', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const albumWithoutDescription: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        description: '',
      } as Album;

      render(<AlbumDetail albumId={7} album={albumWithoutDescription} />);
      // Should not crash, description should not render
      expect(screen.getByText('Albums')).toBeInTheDocument();
    });
  });

  describe('Filter Integration', () => {
    it('applies filters to both albums and images', () => {
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
          <AlbumDetail albumId={7} />
        </FilterProvider>
      );

      // Should only show images, not albums
      expect(screen.getByText('Test Photo')).toBeInTheDocument();
      expect(screen.queryByText('Test Album')).not.toBeInTheDocument();
    });

    it('applies date range filter to albums and images', () => {
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

      const itemsWithDates = [
        {
          ...mockChildren[0],
          timestamp: new Date('2024-06-15').getTime(),
        },
        {
          ...mockChildren[1],
          timestamp: new Date('2025-06-15').getTime(),
        },
      ];

      mockUseAlbumData.mockReturnValue({
        data: itemsWithDates,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <FilterProvider defaultCriteria={criteria}>
          <AlbumDetail albumId={7} />
        </FilterProvider>
      );

      // Should only show items within date range
      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });
  });
});
