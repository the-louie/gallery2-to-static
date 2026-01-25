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
  useSort: vi.fn((_context: 'albums' | 'images') => ({
    option: 'order-asc' as const,
    setOption: vi.fn(),
  })),
}));

// Mock breadcrumbPath utilities (deprecated, but tests may still reference)
vi.mock('@/utils/breadcrumbPath', () => ({
  getParentAlbumId: vi.fn(),
  buildBreadcrumbPath: vi.fn(),
  clearBreadcrumbCache: vi.fn(),
}));

// Mock useSiteMetadata so we can control rootAlbumId (for root vs non-root tests)
const mockUseSiteMetadata = vi.fn();
vi.mock('@/hooks/useSiteMetadata', () => ({
  useSiteMetadata: () => mockUseSiteMetadata(),
}));

// Mock useAlbumMetadata to avoid loadAlbum(parent) calls when metadata/album prop absent
vi.mock('@/hooks/useAlbumMetadata', () => ({
  useAlbumMetadata: vi.fn(
    (_id: number, albumProp: unknown) => (albumProp !== undefined ? albumProp : null),
  ),
}));

describe('AlbumDetail', () => {
  const mockUseAlbumData = vi.mocked(useAlbumDataHook.useAlbumData);
  const mockUseFilter = vi.mocked(useFilterHook.useFilter);

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockUseSiteMetadata.mockReturnValue({
      siteName: null,
      rootAlbumId: 1,
      isLoading: false,
      error: null,
    });
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
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByRole('region', { name: 'Child albums' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Images' })).toBeInTheDocument();
    });

    it('renders with album metadata prop', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
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
      expect(screen.getByText('Short album summary for tests')).toBeInTheDocument();
      expect(screen.getByText(/Owner: Test Owner/)).toBeInTheDocument();
    });

    it('renders back button by default', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByLabelText('Go up')).toBeInTheDocument();
    });

    it('hides back button when showBackButton is false', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} showBackButton={false} />);
      expect(screen.queryByLabelText('Go up')).not.toBeInTheDocument();
    });

    it('hides title when showTitle is false', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
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
        metadata: null,
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
        metadata: null,
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
        metadata: null,
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
        metadata: null,
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
        metadata: null,
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
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByRole('region', { name: 'Child albums' })).toBeInTheDocument();
      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    it('displays child images', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByRole('region', { name: 'Images' })).toBeInTheDocument();
    });

    it('displays only albums section when no images', () => {
      const albumsOnly = mockChildren.filter(
        (child) => child.type === 'GalleryAlbumItem',
      );

      mockUseAlbumData.mockReturnValue({
        data: albumsOnly,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.getByRole('region', { name: 'Child albums' })).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Images' })).not.toBeInTheDocument();
    });

    it('displays only images section when no albums', () => {
      const imagesOnly = mockChildren.filter(
        (child) => child.type === 'GalleryPhotoItem',
      );

      mockUseAlbumData.mockReturnValue({
        data: imagesOnly,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      expect(screen.queryByRole('region', { name: 'Child albums' })).not.toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Images' })).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('hides up button when at root album', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: {
          albumId: 7,
          albumTitle: 'Root',
          albumDescription: null,
          albumTimestamp: null,
          ownerName: null,
          breadcrumbPath: [{ id: 7, title: 'Home', path: '/' }],
        },
        refetch: vi.fn(),
      });
      mockUseSiteMetadata.mockReturnValue({
        siteName: null,
        rootAlbumId: 7,
        isLoading: false,
        error: null,
      });

      render(<AlbumDetail albumId={7} />);

      expect(screen.queryByLabelText('Go up')).not.toBeInTheDocument();
    });

    it('hides up button and AlbumDetailEmpty Go Up when empty album at root', () => {
      mockUseAlbumData.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });
      mockUseSiteMetadata.mockReturnValue({
        siteName: null,
        rootAlbumId: 7,
        isLoading: false,
        error: null,
      });

      render(<AlbumDetail albumId={7} />);

      expect(screen.queryByLabelText('Go up')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Go to home page')).toBeInTheDocument();
      expect(screen.getByText(/Empty Album/)).toBeInTheDocument();
    });

    it('navigates to home when parent is not found (orphaned album)', async () => {
      const user = userEvent.setup();

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: {
          albumId: 99,
          albumTitle: 'Orphaned',
          albumDescription: null,
          albumTimestamp: null,
          ownerName: null,
          breadcrumbPath: [{ id: 99, title: 'Orphaned', path: '/album/99' }],
        },
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={99} />);

      const backButton = screen.getByLabelText('Go up');
      await user.click(backButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('navigates to home when parent lookup fails with error', async () => {
      const user = userEvent.setup();

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: {
          albumId: 7,
          albumTitle: 'Test',
          albumDescription: null,
          albumTimestamp: null,
          ownerName: null,
          breadcrumbPath: [{ id: 7, title: 'Test', path: '/album/7' }],
        },
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);

      const backButton = screen.getByLabelText('Go up');
      await user.click(backButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('disables button while navigating up', async () => {
      const user = userEvent.setup();

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: {
          albumId: 7,
          albumTitle: 'Test',
          albumDescription: null,
          albumTimestamp: null,
          ownerName: null,
          breadcrumbPath: [
            { id: 5, title: 'Parent', path: '/album/5' },
            { id: 7, title: 'Test', path: '/album/7' },
          ],
        },
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);

      const backButton = screen.getByLabelText('Go up');
      expect(backButton).not.toBeDisabled();

      // Click button
      await user.click(backButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/album/5');
        expect(backButton).not.toBeDisabled();
      });
    });

    it('navigates to album when album is clicked', async () => {
      const user = userEvent.setup();

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
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
        metadata: null,
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

    it('navigates to parent album when back button is clicked', async () => {
      const user = userEvent.setup();

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: {
          albumId: 7,
          albumTitle: 'Child',
          albumDescription: null,
          albumTimestamp: null,
          ownerName: null,
          breadcrumbPath: [
            { id: 5, title: 'Parent', path: '/album/5' },
            { id: 7, title: 'Child', path: '/album/7' },
          ],
        },
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);

      const backButton = screen.getByLabelText('Go up');
      await user.click(backButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/album/5');
      });
    });

    it('navigates to direct parent in multi-level hierarchy when Up clicked', async () => {
      const user = userEvent.setup();
      const albumId = 20;
      const directParentId = 10;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: {
          albumId: 20,
          albumTitle: 'Grandchild',
          albumDescription: null,
          albumTimestamp: null,
          ownerName: null,
          breadcrumbPath: [
            { id: 1, title: 'Home', path: '/' },
            { id: 10, title: 'Parent', path: '/album/10' },
            { id: 20, title: 'Grandchild', path: '/album/20' },
          ],
        },
        refetch: vi.fn(),
      });
      mockUseSiteMetadata.mockReturnValue({
        siteName: null,
        rootAlbumId: 1,
        isLoading: false,
        error: null,
      });

      render(<AlbumDetail albumId={albumId} />);

      const backButton = screen.getByLabelText('Go up');
      await user.click(backButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(`/album/${directParentId}`);
      });
    });

    it('calls custom onBackClick handler when provided', async () => {
      const user = userEvent.setup();
      const handleBackClick = vi.fn();

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: {
          albumId: 7,
          albumTitle: 'Test',
          albumDescription: null,
          albumTimestamp: null,
          ownerName: null,
          breadcrumbPath: [
            { id: 5, title: 'Parent', path: '/album/5' },
            { id: 7, title: 'Test', path: '/album/7' },
          ],
        },
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} onBackClick={handleBackClick} />);

      const backButton = screen.getByLabelText('Go up');
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
        metadata: null,
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
        metadata: null,
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
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);

      const homeButton = screen.getByLabelText('Go to home page');
      await user.click(homeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Breadcrumbs Integration', () => {
    it('renders breadcrumbs from metadata', () => {
      const breadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: {
          albumId: 10,
          albumTitle: 'Photos',
          albumDescription: null,
          albumTimestamp: null,
          ownerName: null,
          breadcrumbPath,
        },
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={10} />);
      expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to home page' })).toBeInTheDocument();
      expect(screen.getByText('Photos')).toBeInTheDocument();
    });

    it('does not render breadcrumbs when metadata breadcrumbPath is empty', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: {
          albumId: 10,
          albumTitle: 'Photos',
          albumDescription: null,
          albumTimestamp: null,
          ownerName: null,
          breadcrumbPath: [],
        },
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={10} />);
      expect(
        screen.queryByRole('navigation', { name: 'Breadcrumb' }),
      ).not.toBeInTheDocument();
    });

    it('does not render breadcrumbs when metadata is missing', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={10} />);
      expect(
        screen.queryByRole('navigation', { name: 'Breadcrumb' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for sections', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
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
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      const backButton = screen.getByLabelText('Go up');
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
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} />);
      // Should still render children; sections are present
      expect(screen.getByRole('region', { name: 'Child albums' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Images' })).toBeInTheDocument();
    });

    it('handles empty title gracefully', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      const albumWithoutTitle: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        title: '',
      } as Album;

      render(<AlbumDetail albumId={7} album={albumWithoutTitle} />);
      // Should not crash, title section should not render; sections are present
      expect(screen.getByRole('region', { name: 'Child albums' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Images' })).toBeInTheDocument();
    });

    it('handles empty description gracefully', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      const albumWithoutDescription: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        description: '',
      } as Album;

      render(<AlbumDetail albumId={7} album={albumWithoutDescription} />);
      // Should not crash, description should not render; sections are present
      expect(screen.getByRole('region', { name: 'Child albums' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Images' })).toBeInTheDocument();
    });

    it('does not render summary or owner when null or empty', () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      const albumWithoutSummaryOwner: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        summary: null,
        ownerName: null,
      } as Album;

      render(<AlbumDetail albumId={7} album={albumWithoutSummaryOwner} />);
      expect(screen.getByText('Test Album')).toBeInTheDocument();
      expect(screen.queryByText('Short album summary for tests')).not.toBeInTheDocument();
      expect(screen.queryByText(/Owner: Test Owner/)).not.toBeInTheDocument();
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
        metadata: null,
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
        metadata: null,
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

  describe('BBCode Support', () => {
    it('renders BBCode in album title', async () => {
      const albumWithBBCode: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        title: '[b]Bold Album Title[/b]',
      } as Album;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <AlbumDetail albumId={1} album={albumWithBBCode} />,
      );

      await waitFor(() => {
        const strong = container.querySelector('strong');
        expect(strong).toBeInTheDocument();
        expect(strong?.textContent).toBe('Bold Album Title');
      });
    });

    it('renders nested BBCode in album title', async () => {
      const albumWithBBCode: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        title: '[b][i]Bold Italic Title[/i][/b]',
      } as Album;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <AlbumDetail albumId={1} album={albumWithBBCode} />,
      );

      await waitFor(() => {
        const strong = container.querySelector('strong');
        expect(strong).toBeInTheDocument();
        const em = strong?.querySelector('em');
        expect(em).toBeInTheDocument();
        expect(em?.textContent).toBe('Bold Italic Title');
      });
    });

    it('maintains backward compatibility with titles without BBCode', async () => {
      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={1} album={mockAlbum as Album} />);

      await waitFor(() => {
        expect(screen.getByText('Test Album')).toBeInTheDocument();
      });
    });

    it('parses BBCode in description and summary', async () => {
      const albumWithBBCode: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        title: '[b]Title[/b]',
        description: '[b]Description[/b]',
        summary: '[b]Summary[/b]',
      } as Album;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <AlbumDetail albumId={7} album={albumWithBBCode} />,
      );

      await waitFor(() => {
        const titleStrong = container.querySelector('h2.album-detail-title strong');
        expect(titleStrong).toBeInTheDocument();
        expect(titleStrong).toHaveTextContent('Title');

        const descEl = container.querySelector('.album-detail-description');
        expect(descEl).toBeInTheDocument();
        const descStrong = descEl?.querySelector('strong');
        expect(descStrong).toBeInTheDocument();
        expect(descStrong).toHaveTextContent('Description');

        const summaryEl = container.querySelector('.album-detail-summary');
        expect(summaryEl).toBeInTheDocument();
        const summaryStrong = summaryEl?.querySelector('strong');
        expect(summaryStrong).toBeInTheDocument();
        expect(summaryStrong).toHaveTextContent('Summary');
      });
    });

    it('renders [url] in description as link', async () => {
      const albumWithUrl: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        title: 'Test',
        description: 'Link: [url=https://site.org]Site[/url]',
        summary: null,
      } as Album;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <AlbumDetail albumId={7} album={albumWithUrl} />,
      );

      await waitFor(() => {
        const descEl = container.querySelector('.album-detail-description');
        expect(descEl).toBeInTheDocument();
        const link = descEl?.querySelector('a');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', 'https://site.org');
        expect(link).toHaveTextContent('Site');
      });
    });
  });

  describe('HTML Entity Decoding', () => {
    it('decodes HTML entities in album title', async () => {
      const albumWithEntities: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        title: 'Album &amp; Photos',
      } as Album;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} album={albumWithEntities} />);

      await waitFor(() => {
        expect(screen.getByText('Album & Photos')).toBeInTheDocument();
      });
    });

    it('decodes double-encoded HTML entities in title', async () => {
      const albumWithEntities: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        title: 'Album &amp;amp; More',
      } as Album;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} album={albumWithEntities} />);

      await waitFor(() => {
        expect(screen.getByText('Album & More')).toBeInTheDocument();
      });
    });

    it('decodes HTML entities with BBCode formatting', async () => {
      const albumWithBoth: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        title: '[b]Album &amp; Photos[/b]',
      } as Album;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      const { container } = render(<AlbumDetail albumId={7} album={albumWithBoth} />);

      await waitFor(() => {
        expect(screen.getByText('Album & Photos')).toBeInTheDocument();
        const strong = container.querySelector('h2.album-detail-title strong');
        expect(strong).toBeInTheDocument();
        expect(strong?.textContent).toBe('Album & Photos');
      });
    });

    it('decodes HTML entities in description', async () => {
      const albumWithEntities: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        description: 'Description &amp; More',
      } as Album;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} album={albumWithEntities} />);

      await waitFor(() => {
        expect(screen.getByText('Description & More')).toBeInTheDocument();
      });
    });

    it('decodes HTML entities in summary', async () => {
      const albumWithEntities: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        summary: 'Summary &amp; More',
      } as Album;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} album={albumWithEntities} />);

      await waitFor(() => {
        expect(screen.getByText('Summary & More')).toBeInTheDocument();
      });
    });

    it('decodes HTML entities in owner name', async () => {
      const albumWithEntities: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        ownerName: 'Owner &amp; Co',
      } as Album;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} album={albumWithEntities} />);

      await waitFor(() => {
        expect(screen.getByText(/Owner: Owner & Co/)).toBeInTheDocument();
      });
    });

    it('decodes Latin accent entities in album title', async () => {
      const albumWithAccent: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        title: 'Daniel Lehn&eacute;r',
      } as Album;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      render(<AlbumDetail albumId={7} album={albumWithAccent} />);

      await waitFor(() => {
        expect(screen.getByText('Daniel Lehnér')).toBeInTheDocument();
      });
    });
  });

  describe('Security - HTML Injection Prevention', () => {
    it('escapes HTML entities in titles (React default escaping)', async () => {
      const albumWithScript: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        title: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
      } as Album;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      const { container } = render(<AlbumDetail albumId={7} album={albumWithScript} />);

      await waitFor(() => {
        // React should escape the decoded <script> tags
        expect(screen.getByText('<script>alert("XSS")</script>')).toBeInTheDocument();
        // Verify no actual script tag exists in DOM
        expect(container.querySelector('script')).not.toBeInTheDocument();
      });
    });

    it('does not use dangerouslySetInnerHTML', async () => {
      const albumWithHTML: Album = {
        ...mockAlbum,
        type: 'GalleryAlbumItem',
        title: '[b]Bold[/b]',
      } as Album;

      mockUseAlbumData.mockReturnValue({
        data: mockChildren,
        isLoading: false,
        error: null,
        metadata: null,
        refetch: vi.fn(),
      });

      const { container } = render(<AlbumDetail albumId={7} album={albumWithHTML} />);

      await waitFor(() => {
        // Verify BBCode is parsed to React elements, not raw HTML
        const strong = container.querySelector('h2.album-detail-title strong');
        expect(strong).toBeInTheDocument();
        // Verify no dangerouslySetInnerHTML was used (no raw HTML strings)
        expect(container.innerHTML).not.toContain('[b]');
      });
    });
  });
});
