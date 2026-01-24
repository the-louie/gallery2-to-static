import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import { HomePage } from './HomePage';
import { findRootAlbumId } from '@/utils/dataLoader';
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

vi.mock('@/utils/dataLoader', () => ({
  findRootAlbumId: vi.fn(),
  loadAlbum: vi.fn(),
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    // AlbumGrid should show loading skeleton
    expect(screen.getByRole('region', { name: /album grid/i })).toBeInTheDocument();
  });

  it('displays root album when found', async () => {
    vi.mocked(findRootAlbumId).mockResolvedValue(7);

    render(<HomePage />);

    await waitFor(() => {
      expect(findRootAlbumId).toHaveBeenCalled();
    });

    // AlbumGrid should render with the root album ID
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/data/7.json');
    });
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
