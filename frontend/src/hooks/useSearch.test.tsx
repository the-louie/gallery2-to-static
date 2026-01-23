/**
 * useSearch Hook Tests
 *
 * Tests for the useSearch hook.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSearch } from './useSearch';
import { SearchIndex } from '../utils/searchIndex';
import { findRootAlbumId, loadAlbum } from '../utils/dataLoader';

// Mock dependencies
vi.mock('../utils/searchIndex');
vi.mock('../utils/dataLoader', () => ({
  findRootAlbumId: vi.fn(),
  loadAlbum: vi.fn(),
}));

describe('useSearch', () => {
  let mockSearchIndex: SearchIndex;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSearchIndex = {
      buildIndex: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockReturnValue([]),
      getItem: vi.fn(),
      getItemCount: vi.fn().mockReturnValue(0),
      clear: vi.fn(),
      isIndexBuilding: vi.fn().mockReturnValue(false),
    } as unknown as SearchIndex;

    vi.mocked(SearchIndex).mockImplementation(() => mockSearchIndex);
    vi.mocked(findRootAlbumId).mockResolvedValue(7);
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.results).toEqual([]);
    expect(result.current.query).toBe('');
    expect(result.current.isIndexBuilding).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('builds index on first search', async () => {
    const { result } = renderHook(() => useSearch());

    result.current.search('test');

    await waitFor(() => {
      expect(mockSearchIndex.buildIndex).toHaveBeenCalledWith(7);
    });
  });

  it('performs search after index is built', async () => {
    vi.mocked(mockSearchIndex.getItemCount).mockReturnValue(10);
    const mockResults = [
      {
        item: {
          id: 1,
          type: 'GalleryAlbumItem' as const,
          title: 'Test',
          description: 'Test',
          pathComponent: 'test',
        },
        score: 10,
        matchedInTitle: true,
        matchedInDescription: false,
      },
    ];
    vi.mocked(mockSearchIndex.search).mockReturnValue(mockResults);

    const { result } = renderHook(() => useSearch());

    result.current.search('test');

    await waitFor(() => {
      expect(mockSearchIndex.search).toHaveBeenCalledWith('test');
      expect(result.current.results).toEqual(mockResults);
    });
  });

  it('returns empty results for empty query', async () => {
    const { result } = renderHook(() => useSearch());

    result.current.search('');

    await waitFor(() => {
      expect(result.current.results).toEqual([]);
      expect(mockSearchIndex.search).not.toHaveBeenCalled();
    });
  });

  it('returns empty results for whitespace-only query', async () => {
    const { result } = renderHook(() => useSearch());

    result.current.search('   ');

    await waitFor(() => {
      expect(result.current.results).toEqual([]);
      expect(mockSearchIndex.search).not.toHaveBeenCalled();
    });
  });

  it('handles index loading errors', async () => {
    vi.mocked(mockSearchIndex.buildIndex).mockRejectedValue(
      new Error('Load failed'),
    );

    const { result } = renderHook(() => useSearch());

    result.current.search('test');

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Load failed');
    });
  });

  it('handles search errors', async () => {
    vi.mocked(mockSearchIndex.getItemCount).mockReturnValue(10);
    vi.mocked(mockSearchIndex.search).mockImplementation(() => {
      throw new Error('Search failed');
    });

    const { result } = renderHook(() => useSearch());

    result.current.search('test');

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Search failed');
    });
  });

  it('returns item count from index', () => {
    vi.mocked(mockSearchIndex.getItemCount).mockReturnValue(42);

    const { result } = renderHook(() => useSearch());

    expect(result.current.getItemCount()).toBe(42);
  });
});
