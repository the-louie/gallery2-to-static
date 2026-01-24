import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
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
vi.mock('../utils/dataLoader', () => ({
  loadAlbum: vi.fn(),
  DataLoadError: class DataLoadError extends Error {
    constructor(
      message: string,
      public code: string,
      public cause?: unknown,
    ) {
      super(message);
      this.name = 'DataLoadError';
    }
  },
  NetworkError: class NetworkError extends Error {
    constructor(message: string, cause?: unknown) {
      super(message);
      this.name = 'NetworkError';
    }
  },
  NotFoundError: class NotFoundError extends Error {
    constructor(message: string, cause?: unknown) {
      super(message);
      this.name = 'NotFoundError';
    }
  },
  ParseError: class ParseError extends Error {
    constructor(message: string, cause?: unknown) {
      super(message);
      this.name = 'ParseError';
    }
  },
}));

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
});
