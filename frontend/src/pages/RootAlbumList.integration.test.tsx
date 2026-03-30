/**
 * Root Album List View integration tests (Plan 8.2)
 *
 * Covers: root page shows list view, nested album page shows grid,
 * subalbum links navigate correctly, filter/sort on root list.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import {
  findRootAlbumId,
  loadIndex,
  loadPathIndex,
  resolvePathToAlbumId,
} from '@/utils/dataLoader';
import { mockAlbums } from '@/__mocks__/mockData';
import type { AlbumFile } from '../../../backend/types';

const rootAlbumFile: AlbumFile = {
  metadata: {
    albumId: 7,
    albumTitle: null,
    albumDescription: null,
    albumTimestamp: 0,
    ownerName: null,
  },
  children: mockAlbums,
};

const subalbumFileFor1: AlbumFile = {
  metadata: {
    albumId: 1,
    albumTitle: 'Test Album',
    albumDescription: null,
    albumTimestamp: 0,
    ownerName: null,
  },
  children: mockAlbums,
};

const subalbumFileFor10: AlbumFile = {
  metadata: {
    albumId: 10,
    albumTitle: 'Parent Album',
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

/** Lazy-loaded pages need extra time to resolve in the test environment. */
const LAZY_TIMEOUT = { timeout: 5000 };

vi.mock('@/utils/dataLoader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/dataLoader')>();
  return {
    ...actual,
    findRootAlbumId: vi.fn(),
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

describe('Root Album List View integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadPathIndex).mockResolvedValue({});
    vi.mocked(resolvePathToAlbumId).mockResolvedValue(null);
    vi.mocked(findRootAlbumId).mockResolvedValue(7);
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
    global.fetch = vi.fn().mockImplementation((url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.endsWith('/data/7.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => rootAlbumFile,
        } as Response);
      }
      if (u.endsWith('/data/1.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => subalbumFileFor1,
        } as Response);
      }
      if (u.endsWith('/data/10.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => subalbumFileFor10,
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => rootAlbumFile,
      } as Response);
    });
  });

  it('root (/) shows list view with Root albums region', async () => {
    render(<App />, { initialEntries: ['/'] });

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /root albums/i })).toBeInTheDocument();
    }, LAZY_TIMEOUT);
  });

  it('nested /album/:id shows grid (Album grid region)', async () => {
    render(<App />, { initialEntries: ['/album/7'] });

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /album grid/i })).toBeInTheDocument();
    }, LAZY_TIMEOUT);
  });

  it('subalbum link navigates to /album/:id', async () => {
    const user = userEvent.setup();
    render(<App />, { initialEntries: ['/'] });

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /root albums/i })).toBeInTheDocument();
    }, LAZY_TIMEOUT);

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Subalbums' })).toBeInTheDocument();
    }, LAZY_TIMEOUT);

    const subLink = screen.getByRole('link', { name: 'Parent Album' });
    expect(subLink).toHaveAttribute('href', '/album/10');
    await user.click(subLink);

    await waitFor(() => {
      const grid = screen.queryByRole('region', { name: /album grid/i });
      const empty = screen.queryByText(/no albums found/i);
      const detailEmpty = screen.queryByText(/no albums or images/i);
      expect(Boolean(grid) || Boolean(empty) || Boolean(detailEmpty)).toBe(true);
    }, LAZY_TIMEOUT);
  });

  it('filter and sort apply to root list (SortDropdown present)', async () => {
    render(<App />, { initialEntries: ['/'] });

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /root albums/i })).toBeInTheDocument();
    }, LAZY_TIMEOUT);

    expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument();
  });
});
