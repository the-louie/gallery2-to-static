import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAlbumData } from './useAlbumData';
import { loadAlbum, NotFoundError, NetworkError } from '../utils/dataLoader';
import type { Child, AlbumFile } from '../../../backend/types';

function albumFile(albumId: number, children: Child[]): AlbumFile {
  return {
    metadata: {
      albumId,
      albumTitle: 'Test',
      albumDescription: null,
      albumTimestamp: 0,
      ownerName: null,
    },
    children,
  };
}

// Mock the dataLoader module
vi.mock('../utils/dataLoader', () => {
  class DataLoadError extends Error {
    constructor(
      message: string,
      public code: string,
      public cause?: unknown,
    ) {
      super(message);
      this.name = 'DataLoadError';
    }
  }
  class NetworkError extends DataLoadError {
    constructor(message: string, cause?: unknown) {
      super(message, 'NETWORK_ERROR', cause);
      this.name = 'NetworkError';
    }
  }
  class NotFoundError extends DataLoadError {
    constructor(message: string, cause?: unknown) {
      super(message, 'NOT_FOUND', cause);
      this.name = 'NotFoundError';
    }
  }
  class ParseError extends DataLoadError {
    constructor(message: string, cause?: unknown) {
      super(message, 'PARSE_ERROR', cause);
      this.name = 'ParseError';
    }
  }
  return {
    loadAlbum: vi.fn(),
    DataLoadError,
    NetworkError,
    NotFoundError,
    ParseError,
  };
});

const mockLoadAlbum = vi.mocked(loadAlbum);

describe('useAlbumData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has initial loading state', () => {
    const mockChildren: Child[] = [
      {
        id: 1,
        type: 'GalleryAlbumItem',
        hasChildren: true,
        title: 'Test',
        description: 'Test',
        pathComponent: 'test',
        timestamp: 1234567890,
        width: null,
        height: null,
        thumb_width: null,
        thumb_height: null,
      },
    ];
    mockLoadAlbum.mockResolvedValue(albumFile(1, mockChildren));

    const { result } = renderHook(() => useAlbumData(1));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('loads data successfully', async () => {
    const mockChildren: Child[] = [
      {
        id: 1,
        type: 'GalleryAlbumItem',
        hasChildren: true,
        title: 'Test Album',
        description: 'Test description',
        pathComponent: 'test-album',
        timestamp: 1234567890,
        width: null,
        height: null,
        thumb_width: null,
        thumb_height: null,
      },
    ];
    const file = albumFile(1, mockChildren);
    mockLoadAlbum.mockResolvedValue(file);

    const { result } = renderHook(() => useAlbumData(1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockChildren);
    expect(result.current.metadata).toEqual(file.metadata);
    expect(result.current.error).toBeNull();
    expect(mockLoadAlbum).toHaveBeenCalledWith(1);
  });

  it('handles loading errors', async () => {
    const error = new NotFoundError('Album not found');
    mockLoadAlbum.mockRejectedValue(error);

    const { result } = renderHook(() => useAlbumData(999));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(NotFoundError);
    expect(result.current.error?.message).toBe('Album not found');
  });

  it('handles network errors', async () => {
    const error = new NetworkError('Network failed');
    mockLoadAlbum.mockRejectedValue(error);

    const { result } = renderHook(() => useAlbumData(1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(NetworkError);
  });

  it('does not load when id is null', () => {
    const { result } = renderHook(() => useAlbumData(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.metadata).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockLoadAlbum).not.toHaveBeenCalled();
  });

  it('reloads data when id changes', async () => {
    const mockData1: Child[] = [
      {
        id: 1,
        type: 'GalleryAlbumItem',
        hasChildren: true,
        title: 'Album 1',
        description: 'Album 1',
        pathComponent: 'album-1',
        timestamp: 1234567890,
        width: null,
        height: null,
        thumb_width: null,
        thumb_height: null,
      },
    ];
    const mockData2: Child[] = [
      {
        id: 2,
        type: 'GalleryAlbumItem',
        hasChildren: true,
        title: 'Album 2',
        description: 'Album 2',
        pathComponent: 'album-2',
        timestamp: 1234567890,
        width: null,
        height: null,
        thumb_width: null,
        thumb_height: null,
      },
    ];
    mockLoadAlbum
      .mockResolvedValueOnce(albumFile(1, mockData1))
      .mockResolvedValueOnce(albumFile(2, mockData2));

    const { result, rerender } = renderHook(
      ({ id }) => useAlbumData(id),
      { initialProps: { id: 1 } },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1);
    });

    rerender({ id: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    expect(mockLoadAlbum).toHaveBeenCalledTimes(2);
    expect(mockLoadAlbum).toHaveBeenCalledWith(1);
    expect(mockLoadAlbum).toHaveBeenCalledWith(2);
  });

  it('refetch function reloads data', async () => {
    const mockChildren: Child[] = [
      {
        id: 1,
        type: 'GalleryAlbumItem',
        hasChildren: true,
        title: 'Test',
        description: 'Test',
        pathComponent: 'test',
        timestamp: 1234567890,
        width: null,
        height: null,
        thumb_width: null,
        thumb_height: null,
      },
    ];
    const file = albumFile(1, mockChildren);
    mockLoadAlbum.mockResolvedValue(file);

    const { result } = renderHook(() => useAlbumData(1));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockChildren);
    });

    mockLoadAlbum.mockClear();
    mockLoadAlbum.mockResolvedValue(file);

    result.current.refetch();

    await waitFor(() => {
      expect(mockLoadAlbum).toHaveBeenCalledWith(1);
    });
  });

  it('does not update state after unmount', async () => {
    const mockChildren: Child[] = [
      {
        id: 1,
        type: 'GalleryAlbumItem',
        hasChildren: true,
        title: 'Test',
        description: 'Test',
        pathComponent: 'test',
        timestamp: 1234567890,
        width: null,
        height: null,
        thumb_width: null,
        thumb_height: null,
      },
    ];
    const file = albumFile(1, mockChildren);
    let resolveLoad: (value: AlbumFile) => void;
    const loadPromise = new Promise<AlbumFile>((resolve) => {
      resolveLoad = resolve;
    });
    mockLoadAlbum.mockReturnValue(loadPromise);

    const { unmount } = renderHook(() => useAlbumData(1));

    unmount();
    resolveLoad!(file);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockLoadAlbum).toHaveBeenCalledWith(1);
  });

  it('handles rapid id changes', async () => {
    const mockData1: Child[] = [
      {
        id: 1,
        type: 'GalleryAlbumItem',
        hasChildren: true,
        title: 'Album 1',
        description: 'Album 1',
        pathComponent: 'album-1',
        timestamp: 1234567890,
        width: null,
        height: null,
        thumb_width: null,
        thumb_height: null,
      },
    ];
    const mockData2: Child[] = [
      {
        id: 2,
        type: 'GalleryAlbumItem',
        hasChildren: true,
        title: 'Album 2',
        description: 'Album 2',
        pathComponent: 'album-2',
        timestamp: 1234567890,
        width: null,
        height: null,
        thumb_width: null,
        thumb_height: null,
      },
    ];
    mockLoadAlbum
      .mockResolvedValueOnce(albumFile(1, mockData1))
      .mockResolvedValueOnce(albumFile(2, mockData2));

    const { result, rerender } = renderHook(
      ({ id }) => useAlbumData(id),
      { initialProps: { id: 1 } },
    );

    rerender({ id: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    expect(mockLoadAlbum).toHaveBeenCalledWith(1);
    expect(mockLoadAlbum).toHaveBeenCalledWith(2);
  });

  it('discards stale data when album ID changes before first load completes', async () => {
    let resolveAlbum1: (value: AlbumFile) => void;
    const album1Promise = new Promise<AlbumFile>((resolve) => {
      resolveAlbum1 = resolve;
    });
    const album1Child: Child = {
      id: 10,
      type: 'GalleryPhotoItem',
      hasChildren: false,
      title: 'Album 1 Photo',
      description: 'Stale',
      pathComponent: 'stale-photo',
      timestamp: 1000000000,
      width: 800,
      height: 600,
      thumb_width: 150,
      thumb_height: 150,
    };
    const album2Child: Child = {
      id: 20,
      type: 'GalleryPhotoItem',
      hasChildren: false,
      title: 'Album 2 Photo',
      description: 'Current',
      pathComponent: 'current-photo',
      timestamp: 2000000000,
      width: 800,
      height: 600,
      thumb_width: 150,
      thumb_height: 150,
    };
    const album2Data: Child[] = [album2Child];

    mockLoadAlbum
      .mockReturnValueOnce(album1Promise) // album 1 - delayed
      .mockResolvedValueOnce(albumFile(2, album2Data)); // album 2 - resolves immediately

    const { result, rerender } = renderHook(
      ({ id }) => useAlbumData(id),
      { initialProps: { id: 1 } },
    );

    // Change to album 2 before album 1 resolves
    rerender({ id: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual(album2Data);
    });

    // Now resolve album 1 (stale)
    resolveAlbum1!(albumFile(1, [album1Child]));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Data should still be album 2's data, NOT album 1's
    expect(result.current.data).toEqual(album2Data);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles rapid triple ID change correctly', async () => {
    const child1: Child = {
      id: 1,
      type: 'GalleryAlbumItem',
      hasChildren: true,
      title: 'Album 1',
      description: 'Album 1',
      pathComponent: 'album-1',
      timestamp: 1234567890,
      width: null,
      height: null,
      thumb_width: null,
      thumb_height: null,
    };
    const child2: Child = {
      id: 2,
      type: 'GalleryAlbumItem',
      hasChildren: true,
      title: 'Album 2',
      description: 'Album 2',
      pathComponent: 'album-2',
      timestamp: 1234567890,
      width: null,
      height: null,
      thumb_width: null,
      thumb_height: null,
    };
    const child3: Child = {
      id: 3,
      type: 'GalleryAlbumItem',
      hasChildren: true,
      title: 'Album 3',
      description: 'Album 3',
      pathComponent: 'album-3',
      timestamp: 1234567890,
      width: null,
      height: null,
      thumb_width: null,
      thumb_height: null,
    };
    const data3: Child[] = [child3];

    mockLoadAlbum
      .mockResolvedValueOnce(albumFile(1, [child1]))
      .mockResolvedValueOnce(albumFile(2, [child2]))
      .mockResolvedValueOnce(albumFile(3, data3));

    const { result, rerender } = renderHook(
      ({ id }) => useAlbumData(id),
      { initialProps: { id: 1 } },
    );

    rerender({ id: 2 });
    rerender({ id: 3 });

    await waitFor(() => {
      expect(result.current.data).toEqual(data3);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('refetch invalidates previous in-flight load', async () => {
    let resolveFirst: (value: AlbumFile) => void;
    const firstPromise = new Promise<AlbumFile>((resolve) => {
      resolveFirst = resolve;
    });
    const oldChild: Child = {
      id: 1,
      type: 'GalleryAlbumItem',
      hasChildren: true,
      title: 'Old',
      description: 'Old',
      pathComponent: 'old',
      timestamp: 1234567890,
      width: null,
      height: null,
      thumb_width: null,
      thumb_height: null,
    };
    const refetchChild: Child = {
      id: 1,
      type: 'GalleryAlbumItem',
      hasChildren: true,
      title: 'Refetched',
      description: 'Refetched',
      pathComponent: 'refetched',
      timestamp: 1234567890,
      width: null,
      height: null,
      thumb_width: null,
      thumb_height: null,
    };
    const refetchData: Child[] = [refetchChild];

    mockLoadAlbum
      .mockReturnValueOnce(firstPromise) // initial load - delayed
      .mockResolvedValueOnce(albumFile(1, refetchData)); // refetch - resolves immediately

    const { result } = renderHook(() => useAlbumData(1));

    // Refetch before first load completes
    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(refetchData);
    });

    // Resolve first load (stale)
    resolveFirst!(albumFile(1, [oldChild]));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Data should still be from refetch
    expect(result.current.data).toEqual(refetchData);
    expect(result.current.isLoading).toBe(false);
  });
});
