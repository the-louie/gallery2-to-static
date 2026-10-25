import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import App from '@/App';
import {
  findRootAlbumId,
  loadAlbum,
  loadIndex,
  loadPathIndex,
  resolvePathToAlbumId,
} from '@/utils/dataLoader';
import type { AlbumFile } from '@/types';

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

vi.mock('@/hooks/useSiteMetadata', () => ({
  useSiteMetadata: vi.fn().mockReturnValue({
    siteName: 'Test Gallery',
    siteDescription: 'Test',
    rootAlbumId: 7,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/utils/dataLoader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/dataLoader')>();
  return {
    ...actual,
    findRootAlbumId: vi.fn(),
    loadAlbum: vi.fn(),
    loadIndex: vi.fn().mockResolvedValue({
      rootAlbumId: 7,
      rootAlbumFile: '7.json',
      siteName: 'Test Gallery',
      siteDescription: 'Test',
      generatedAt: '2026-01-01T00:00:00Z',
      metadata: {
        rootAlbumId: 7,
        rootAlbumTitle: 'Test Gallery',
        rootAlbumDescription: 'Test',
        rootAlbumTimestamp: null,
      },
    }),
    loadPathIndex: vi.fn().mockResolvedValue({}),
    resolvePathToAlbumId: vi.fn().mockResolvedValue(null),
  };
});

/** Lazy-loaded pages need extra time to resolve in the test environment. */
const LAZY_TIMEOUT = { timeout: 8000 };

describe('App', { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findRootAlbumId).mockResolvedValue(7);
    vi.mocked(loadPathIndex).mockResolvedValue({});
    vi.mocked(resolvePathToAlbumId).mockResolvedValue(null);
    vi.mocked(loadIndex).mockResolvedValue({
      rootAlbumId: 7,
      rootAlbumFile: '7.json',
      siteName: 'Test Gallery',
      siteDescription: 'Test',
      generatedAt: '2026-01-01T00:00:00Z',
      metadata: {
        rootAlbumId: 7,
        rootAlbumTitle: 'Test Gallery',
        rootAlbumDescription: 'Test',
        rootAlbumTimestamp: null,
      },
    });
    vi.mocked(loadAlbum).mockResolvedValue(emptyAlbumFile);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => emptyAlbumFile,
    } as Response);
  });

  it('renders Layout with routing', () => {
    render(<App />, { initialEntries: ['/'] });

    // Check for Layout header
    expect(screen.getByText('Test Gallery')).toBeInTheDocument();
  });

  it('renders home page on root route', async () => {
    render(<App />, { initialEntries: ['/'] });

    await waitFor(() => {
      const root = screen.queryByRole('region', { name: /root albums/i });
      const empty = screen.queryByText(/no albums found/i);
      expect(Boolean(root) || Boolean(empty)).toBe(true);
    }, LAZY_TIMEOUT);
  });

  it('renders album detail page on /album/:id route', async () => {
    render(<App />, { initialEntries: ['/album/7'] });

    await waitFor(() => {
      const grid = screen.queryByRole('region', { name: /album grid/i });
      const empty = screen.queryByText(/no albums found/i);
      const detailEmpty = screen.queryByText(/no albums or images/i);
      expect(Boolean(grid) || Boolean(empty) || Boolean(detailEmpty)).toBe(true);
    }, LAZY_TIMEOUT);
  });

  it('renders image detail page on /image/:id route', async () => {
    render(<App />, { initialEntries: ['/image/42'] });

    // Legacy route without album context shows informative message
    await waitFor(() => {
      expect(screen.getByText('Legacy Route Not Supported')).toBeInTheDocument();
    }, LAZY_TIMEOUT);
  });

  it('renders 404 page on invalid route', async () => {
    render(<App />, { initialEntries: ['/invalid-route'] });

    // PathResolverPage resolves asynchronously and navigates to /not-found
    await waitFor(() => {
      expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
    }, LAZY_TIMEOUT);
  });

  it('renders 404 page on /not-found route', async () => {
    render(<App />, { initialEntries: ['/not-found'] });

    await waitFor(() => {
      expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
    }, LAZY_TIMEOUT);
  });

  describe('Route Navigation', () => {
    it('navigates to home page', async () => {
      render(<App />, { initialEntries: ['/album/7'] });
      render(<App />, { initialEntries: ['/'] });

      await waitFor(() => {
        const root = screen.queryByRole('region', { name: /root albums/i });
        const empty = screen.queryByText(/no albums found/i);
        expect(Boolean(root) || Boolean(empty)).toBe(true);
      }, LAZY_TIMEOUT);
    });

    it('navigates to album detail page', async () => {
      render(<App />, { initialEntries: ['/'] });
      render(<App />, { initialEntries: ['/album/7'] });

      await waitFor(() => {
        const grid = screen.queryByRole('region', { name: /album grid/i });
        const empty = screen.queryByText(/no albums found/i);
        const detailEmpty = screen.queryByText(/no albums or images/i);
        expect(Boolean(grid) || Boolean(empty) || Boolean(detailEmpty)).toBe(true);
      }, LAZY_TIMEOUT);
    });

    it('navigates to image detail page', async () => {
      render(<App />, { initialEntries: ['/image/42'] });

      await waitFor(() => {
        expect(screen.getByText('Legacy Route Not Supported')).toBeInTheDocument();
      }, LAZY_TIMEOUT);
    });

    it('navigates to 404 page for invalid routes', async () => {
      render(<App />, { initialEntries: ['/invalid-route'] });

      await waitFor(() => {
        expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
      }, LAZY_TIMEOUT);
    });
  });

  describe('Deep Linking', () => {
    it('handles direct URL access to home', async () => {
      render(<App />, { initialEntries: ['/'] });

      await waitFor(() => {
        const root = screen.queryByRole('region', { name: /root albums/i });
        const empty = screen.queryByText(/no albums found/i);
        expect(Boolean(root) || Boolean(empty)).toBe(true);
      }, LAZY_TIMEOUT);
    });

    it('handles direct URL access to album', async () => {
      render(<App />, { initialEntries: ['/album/7'] });

      await waitFor(() => {
        const grid = screen.queryByRole('region', { name: /album grid/i });
        const empty = screen.queryByText(/no albums found/i);
        const detailEmpty = screen.queryByText(/no albums or images/i);
        expect(Boolean(grid) || Boolean(empty) || Boolean(detailEmpty)).toBe(true);
      }, LAZY_TIMEOUT);
    });

    it('handles direct URL access to image', async () => {
      render(<App />, { initialEntries: ['/image/42'] });

      await waitFor(() => {
        expect(screen.getByText('Legacy Route Not Supported')).toBeInTheDocument();
      }, LAZY_TIMEOUT);
    });

    it('handles direct URL access to invalid route', async () => {
      render(<App />, { initialEntries: ['/nonexistent-route'] });

      await waitFor(() => {
        expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
      }, LAZY_TIMEOUT);
    });
  });

  describe('Route Parameter Handling', () => {
    it('handles valid album ID parameter', async () => {
      render(<App />, { initialEntries: ['/album/7'] });

      await waitFor(() => {
        const grid = screen.queryByRole('region', { name: /album grid/i });
        const empty = screen.queryByText(/no albums found/i);
        const detailEmpty = screen.queryByText(/no albums or images/i);
        expect(Boolean(grid) || Boolean(empty) || Boolean(detailEmpty)).toBe(true);
      }, LAZY_TIMEOUT);
    });

    it('handles valid image ID parameter', async () => {
      render(<App />, { initialEntries: ['/image/42'] });

      await waitFor(() => {
        expect(screen.getByText('Legacy Route Not Supported')).toBeInTheDocument();
      }, LAZY_TIMEOUT);
    });

    it('handles invalid parameter formats', async () => {
      render(<App />, { initialEntries: ['/album/invalid'] });

      await waitFor(() => {
        expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
      }, LAZY_TIMEOUT);
    });

    it('handles missing parameters for album route', async () => {
      render(<App />, { initialEntries: ['/album/'] });

      // /album/ goes to PathResolverPage which asynchronously navigates to /not-found
      await waitFor(() => {
        const notFound = screen.queryByText('404 - Page Not Found');
        const invalidId = screen.queryByText(/Invalid Album ID/i);
        expect(notFound || invalidId).toBeTruthy();
      }, LAZY_TIMEOUT);
    });
  });

  describe('Accessibility', () => {
    it('has home link and site name in header', () => {
      render(<App />, { initialEntries: ['/'] });

      const homeLink = screen.getByRole('link', { name: /go to home page/i });
      expect(homeLink).toBeInTheDocument();
      expect(screen.getByText('Test Gallery')).toBeInTheDocument();
    });
  });
});
