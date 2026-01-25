import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import App from '@/App';
import { findRootAlbumId, loadAlbum } from '@/utils/dataLoader';
import type { AlbumFile } from '../../../backend/types';

const emptyAlbumFile: AlbumFile = {
  metadata: {
    albumId: 7,
    albumTitle: null,
    albumDescription: null,
    albumTimestamp: 0,
    ownerName: null,
  },
  children: [],
};

vi.mock('@/utils/dataLoader', () => ({
  findRootAlbumId: vi.fn(),
  loadAlbum: vi.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadAlbum).mockResolvedValue(emptyAlbumFile);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => emptyAlbumFile,
    } as Response);
  });

  it('renders Layout with routing', () => {
    vi.mocked(findRootAlbumId).mockResolvedValue(7);

    render(<App />, { initialEntries: ['/'] });

    // Check for Layout header
    expect(screen.getByText('Gallery 2 to Static')).toBeInTheDocument();
  });

  it('renders home page on root route', async () => {
    vi.mocked(findRootAlbumId).mockResolvedValue(7);

    render(<App />, { initialEntries: ['/'] });

    await waitFor(() => {
      const root = screen.queryByRole('region', { name: /root albums/i });
      const empty = screen.queryByText(/no albums found/i);
      expect(Boolean(root) || Boolean(empty)).toBe(true);
    });
  });

  it('renders album detail page on /album/:id route', async () => {
    render(<App />, { initialEntries: ['/album/7'] });

    await waitFor(() => {
      const grid = screen.queryByRole('region', { name: /album grid/i });
      const empty = screen.queryByText(/no albums found/i);
      expect(Boolean(grid) || Boolean(empty)).toBe(true);
    });
  });

  it('renders image detail page on /image/:id route', () => {
    render(<App />, { initialEntries: ['/image/42'] });

    // ImageDetailPage should be rendered
    expect(screen.getByText('Image Detail View')).toBeInTheDocument();
  });

  it('renders 404 page on invalid route', () => {
    render(<App />, { initialEntries: ['/invalid-route'] });

    // NotFoundPage should be rendered
    expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
  });

  it('renders 404 page on /not-found route', () => {
    render(<App />, { initialEntries: ['/not-found'] });

    // NotFoundPage should be rendered
    expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
  });

  describe('Route Navigation', () => {
    it('navigates to home page', async () => {
      vi.mocked(findRootAlbumId).mockResolvedValue(7);

      render(<App />, { initialEntries: ['/album/7'] });
      render(<App />, { initialEntries: ['/'] });

      await waitFor(() => {
        const root = screen.queryByRole('region', { name: /root albums/i });
        const empty = screen.queryByText(/no albums found/i);
        expect(Boolean(root) || Boolean(empty)).toBe(true);
      });
    });

    it('navigates to album detail page', async () => {
      render(<App />, { initialEntries: ['/'] });
      render(<App />, { initialEntries: ['/album/7'] });

      await waitFor(() => {
        const grid = screen.queryByRole('region', { name: /album grid/i });
        const empty = screen.queryByText(/no albums found/i);
        expect(Boolean(grid) || Boolean(empty)).toBe(true);
      });
    });

    it('navigates to image detail page', () => {
      render(<App />, { initialEntries: ['/'] });
      render(<App />, { initialEntries: ['/image/42'] });

      expect(screen.getByText('Image Detail View')).toBeInTheDocument();
    });

    it('navigates to 404 page for invalid routes', () => {
      render(<App />, { initialEntries: ['/'] });
      render(<App />, { initialEntries: ['/invalid-route'] });

      expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
    });
  });

  describe('Deep Linking', () => {
    it('handles direct URL access to home', async () => {
      vi.mocked(findRootAlbumId).mockResolvedValue(7);

      render(<App />, { initialEntries: ['/'] });

      await waitFor(() => {
        const root = screen.queryByRole('region', { name: /root albums/i });
        const empty = screen.queryByText(/no albums found/i);
        expect(Boolean(root) || Boolean(empty)).toBe(true);
      });
    });

    it('handles direct URL access to album', async () => {
      render(<App />, { initialEntries: ['/album/7'] });

      await waitFor(() => {
        const grid = screen.queryByRole('region', { name: /album grid/i });
        const empty = screen.queryByText(/no albums found/i);
        expect(Boolean(grid) || Boolean(empty)).toBe(true);
      });
    });

    it('handles direct URL access to image', () => {
      render(<App />, { initialEntries: ['/image/42'] });

      expect(screen.getByText('Image Detail View')).toBeInTheDocument();
      expect(screen.getByText('Image ID: 42')).toBeInTheDocument();
    });

    it('handles direct URL access to invalid route', () => {
      render(<App />, { initialEntries: ['/nonexistent-route'] });

      expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
    });
  });

  describe('Route Parameter Handling', () => {
    it('handles valid album ID parameter', async () => {
      render(<App />, { initialEntries: ['/album/7'] });

      await waitFor(() => {
        const grid = screen.queryByRole('region', { name: /album grid/i });
        const empty = screen.queryByText(/no albums found/i);
        expect(Boolean(grid) || Boolean(empty)).toBe(true);
      });
    });

    it('handles valid image ID parameter', () => {
      render(<App />, { initialEntries: ['/image/42'] });

      expect(screen.getByText('Image ID: 42')).toBeInTheDocument();
    });

    it('handles invalid parameter formats', () => {
      render(<App />, { initialEntries: ['/album/invalid'] });

      // Should redirect to 404
      expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
    });

    it('handles missing parameters for album route', () => {
      render(<App />, { initialEntries: ['/album/'] });

      // Should show 404 or handle gracefully - check for either
      const notFound = screen.queryByText('404 - Page Not Found');
      const invalidId = screen.queryByText(/Invalid Album ID/i);
      expect(notFound || invalidId).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has home link and site name in header', () => {
      vi.mocked(findRootAlbumId).mockResolvedValue(7);

      render(<App />, { initialEntries: ['/'] });

      const homeLink = screen.getByRole('link', { name: /go to home page/i });
      expect(homeLink).toBeInTheDocument();
      expect(screen.getByText('Gallery 2 to Static')).toBeInTheDocument();
    });
  });
});
