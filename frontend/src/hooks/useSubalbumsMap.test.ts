/**
 * Tests for useSubalbumsMap hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSubalbumsMap } from './useSubalbumsMap';
import { loadAlbum, DataLoadError } from '@/utils/dataLoader';
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

function albumChild(id: number, title: string): Child {
  return {
    id,
    type: 'GalleryAlbumItem',
    hasChildren: true,
    title,
    description: null,
    pathComponent: `album-${id}`,
    timestamp: 0,
    width: null,
    height: null,
    thumb_width: null,
    thumb_height: null,
  };
}

vi.mock('@/utils/dataLoader', () => ({
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
}));

const mockLoadAlbum = vi.mocked(loadAlbum);

describe('useSubalbumsMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips loading when albumIds is empty', async () => {
    const { result } = renderHook(() => useSubalbumsMap([]));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subalbumsMap.size).toBe(0);
    expect(result.current.error).toBeNull();
    expect(mockLoadAlbum).not.toHaveBeenCalled();
  });

  it('loads subalbums for a single album', async () => {
    const subalbums: Child[] = [
      albumChild(10, 'Sub A'),
      albumChild(11, 'Sub B'),
    ];
    mockLoadAlbum.mockResolvedValue(albumFile(1, subalbums));

    const { result } = renderHook(() => useSubalbumsMap([1]));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockLoadAlbum).toHaveBeenCalledWith(1);
    const list = result.current.subalbumsMap.get(1) ?? [];
    expect(list).toHaveLength(2);
    expect(list[0]?.title).toBe('Sub A');
    expect(list[1]?.title).toBe('Sub B');
    expect(result.current.error).toBeNull();
  });

  it('loads subalbums for multiple albums in parallel', async () => {
    mockLoadAlbum
      .mockResolvedValueOnce(albumFile(1, [albumChild(10, 'A1')]))
      .mockResolvedValueOnce(albumFile(2, [albumChild(20, 'A2')]));

    const { result } = renderHook(() => useSubalbumsMap([1, 2]));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockLoadAlbum).toHaveBeenCalledWith(1);
    expect(mockLoadAlbum).toHaveBeenCalledWith(2);
    expect(result.current.subalbumsMap.get(1)).toHaveLength(1);
    expect(result.current.subalbumsMap.get(2)).toHaveLength(1);
    expect(result.current.subalbumsMap.get(1)?.[0]?.title).toBe('A1');
    expect(result.current.subalbumsMap.get(2)?.[0]?.title).toBe('A2');
  });

  it('returns partial results and error on loadAlbum failure', async () => {
    mockLoadAlbum
      .mockResolvedValueOnce(albumFile(1, [albumChild(10, 'Ok')]))
      .mockRejectedValueOnce(new DataLoadError('Not found', 'NOT_FOUND'));

    const { result } = renderHook(() => useSubalbumsMap([1, 2]));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subalbumsMap.get(1)).toHaveLength(1);
    expect(result.current.subalbumsMap.get(2)).toHaveLength(0);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toContain('2');
  });

  it('filters to albums only (excludes photos)', async () => {
    const mixed: Child[] = [
      albumChild(10, 'Album'),
      {
        id: 11,
        type: 'GalleryPhotoItem',
        hasChildren: false,
        title: 'Photo',
        description: null,
        pathComponent: 'photo.jpg',
        timestamp: 0,
        width: 800,
        height: 600,
        thumb_width: 100,
        thumb_height: 75,
      },
    ];
    mockLoadAlbum.mockResolvedValue(albumFile(1, mixed));

    const { result } = renderHook(() => useSubalbumsMap([1]));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const list = result.current.subalbumsMap.get(1) ?? [];
    expect(list).toHaveLength(1);
    expect(list[0]?.type).toBe('GalleryAlbumItem');
  });

  it('handles duplicate IDs and returns correct map', async () => {
    const sub = [albumChild(10, 'Sub')];
    mockLoadAlbum.mockResolvedValue(albumFile(1, sub));

    const { result } = renderHook(() => useSubalbumsMap([1, 1]));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subalbumsMap.get(1)).toHaveLength(1);
  });
});
