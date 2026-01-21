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

describe('AlbumGrid', () => {
  const mockUseAlbumData = vi.mocked(useAlbumDataHook.useAlbumData);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering with Albums Prop', () => {
    it('renders albums from props', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
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

  describe('View Mode', () => {
    it('applies grid view mode class', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <AlbumGrid albums={mockAlbums} viewMode="grid" />,
      );
      const grid = container.querySelector('.album-grid');
      expect(grid).toHaveClass('album-grid-grid');
    });

    it('applies list view mode class', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { container } = render(
        <AlbumGrid albums={mockAlbums} viewMode="list" />,
      );
      const grid = container.querySelector('.album-grid');
      expect(grid).toHaveClass('album-grid-list');
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

      render(<AlbumGrid albums={mockAlbums} />);
      const grid = screen.getByRole('region', { name: 'Album grid' });
      expect(grid).toBeInTheDocument();
    });

    it('has aria-busy during loading', () => {
      mockUseAlbumData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
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
        refetch: vi.fn(),
      });

      render(<AlbumGrid albumId={7} />);
      // Should only show albums
      expect(screen.getByText('Test Album')).toBeInTheDocument();
      expect(screen.queryByText('Test Photo')).not.toBeInTheDocument();
    });
  });
});
