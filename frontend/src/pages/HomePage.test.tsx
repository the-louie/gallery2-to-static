import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import { HomePage } from './HomePage';
import {
  findRootAlbumId,
  loadIndex,
  loadPathIndex,
  resolvePathToAlbumId,
} from '@/utils/dataLoader';
import { mockChildren } from '@/__mocks__/mockData';
import type { AlbumFile } from '../../../backend/types';

const albumFileForRoot: AlbumFile = {
  metadata: {
    albumId: 7,
    albumTitle: null,
    albumDescription: null,
    albumTimestamp: 0,
    ownerName: null,
  },
  children: mockChildren,
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

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => albumFileForRoot,
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays loading state initially', () => {
    vi.mocked(findRootAlbumId).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(7), 100)),
    );

    render(<HomePage />);
    const loadingElements = screen.getAllByRole('status', { name: /loading gallery/i });
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('displays root album when found', async () => {
    vi.mocked(findRootAlbumId).mockResolvedValue(7);

    render(<HomePage />);

    await waitFor(() => {
      expect(findRootAlbumId).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /root albums/i })).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/data/7.json');
  });

  it('displays error when root album not found', async () => {
    vi.mocked(findRootAlbumId).mockResolvedValue(null);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText(/Error Loading Gallery/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Root album not found/i),
    ).toBeInTheDocument();
  });

  it('displays error when root album discovery fails', async () => {
    const error = new Error('Network error');
    vi.mocked(findRootAlbumId).mockRejectedValue(error);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText(/Error Loading Gallery/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Failed to discover root album/i)).toBeInTheDocument();
  });
});
