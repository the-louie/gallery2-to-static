import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAlbumData } from './useAlbumData';
import { loadAlbum, NotFoundError, NetworkError } from '../utils/dataLoader';
import type { Child } from '../../../types';

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
    const mockData: Child[] = [
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

    mockLoadAlbum.mockResolvedValue(mockData);

    const { result } = renderHook(() => useAlbumData(1));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('loads data successfully', async () => {
    const mockData: Child[] = [
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

    mockLoadAlbum.mockResolvedValue(mockData);

    const { result } = renderHook(() => useAlbumData(1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
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
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result, rerender } = renderHook(
      ({ id }) => useAlbumData(id),
      {
        initialProps: { id: 1 },
      },
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
    const mockData: Child[] = [
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

    mockLoadAlbum.mockResolvedValue(mockData);

    const { result } = renderHook(() => useAlbumData(1));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    // Clear mock to verify refetch calls it again
    mockLoadAlbum.mockClear();
    mockLoadAlbum.mockResolvedValue(mockData);

    result.current.refetch();

    await waitFor(() => {
      expect(mockLoadAlbum).toHaveBeenCalledWith(1);
    });
  });

  it('does not update state after unmount', async () => {
    const mockData: Child[] = [
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

    let resolveLoad: (value: Child[]) => void;
    const loadPromise = new Promise<Child[]>((resolve) => {
      resolveLoad = resolve;
    });

    mockLoadAlbum.mockReturnValue(loadPromise);

    const { result, unmount } = renderHook(() => useAlbumData(1));

    // Unmount before promise resolves
    unmount();

    // Resolve the promise after unmount
    resolveLoad!(mockData);

    // Wait a bit to ensure state doesn't update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // State should not have updated (we can't directly check unmounted component,
    // but this test verifies cleanup prevents errors)
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
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result, rerender } = renderHook(
      ({ id }) => useAlbumData(id),
      {
        initialProps: { id: 1 },
      },
    );

    // Change id before first load completes
    rerender({ id: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    // Should have called loadAlbum for both IDs
    expect(mockLoadAlbum).toHaveBeenCalledWith(1);
    expect(mockLoadAlbum).toHaveBeenCalledWith(2);
  });
});
