import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadAlbum,
  findRootAlbumId,
  getCachedData,
  setCachedData,
  clearCache,
  NetworkError,
  ParseError,
  NotFoundError,
  DataLoadError,
} from './dataLoader';
import type { Child } from '../../../backend/types';

describe('dataLoader', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
  });

  describe('loadAlbum', () => {
    it('loads album data successfully', async () => {
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

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await loadAlbum(1);

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/data/1.json');
    });

    it('returns cached data if available', async () => {
      const mockData: Child[] = [
        {
          id: 2,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Cached Album',
          description: 'Cached description',
          pathComponent: 'cached-album',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      // Set cache
      setCachedData('/data/2.json', mockData);

      // Should not call fetch
      const result = await loadAlbum(2);

      expect(result).toEqual(mockData);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('caches data after successful load', async () => {
      const mockData: Child[] = [
        {
          id: 3,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Cache Test',
          description: 'Cache test description',
          pathComponent: 'cache-test',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      // First load
      await loadAlbum(3);

      // Verify data was cached
      const cached = getCachedData('/data/3.json');
      expect(cached).toEqual(mockData);
    });

    it('uses cache on second load without calling fetch', async () => {
      const mockData: Child[] = [
        {
          id: 4,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Cache Hit Test',
          description: 'Cache hit test description',
          pathComponent: 'cache-hit-test',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      // First load - should call fetch
      const result1 = await loadAlbum(4);
      expect(result1).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second load - should use cache, not call fetch
      global.fetch.mockClear();
      const result2 = await loadAlbum(4);
      expect(result2).toEqual(mockData);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('throws NotFoundError for 404 responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(loadAlbum(999)).rejects.toThrow(NotFoundError);
      await expect(loadAlbum(999)).rejects.toThrow('Album 999 not found');
    });

    it('throws NetworkError for non-404 HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(loadAlbum(1)).rejects.toThrow(NetworkError);
      await expect(loadAlbum(1)).rejects.toThrow('Failed to load album 1');
    });

    it('throws NetworkError for network failures', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        new TypeError('Failed to fetch'),
      );

      await expect(loadAlbum(1)).rejects.toThrow(NetworkError);
    });

    it('throws ParseError for invalid JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      });

      await expect(loadAlbum(1)).rejects.toThrow(ParseError);
      await expect(loadAlbum(1)).rejects.toThrow('Failed to parse JSON');
    });

    it('throws ParseError for invalid data structure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'data' }),
      });

      await expect(loadAlbum(1)).rejects.toThrow(ParseError);
      await expect(loadAlbum(1)).rejects.toThrow('Invalid data structure');
    });

    it('throws ParseError for non-array data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => 'not an array',
      });

      await expect(loadAlbum(1)).rejects.toThrow(ParseError);
    });

    it('handles empty array', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const result = await loadAlbum(1);
      expect(result).toEqual([]);
    });
  });

  describe('findRootAlbumId', () => {
    it('returns 7 if 7.json exists', async () => {
      const mockData: Child[] = [
        {
          id: 7,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Root Album',
          description: 'Root description',
          pathComponent: 'root',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const rootId = await findRootAlbumId();

      expect(rootId).toBe(7);
      expect(global.fetch).toHaveBeenCalledWith('/data/7.json');
    });

    it('tries common root IDs if 7.json not found', async () => {
      // Mock 7.json as not found
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })
        // Mock 1.json as found
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: 1,
              type: 'GalleryAlbumItem',
              hasChildren: true,
              title: 'Root',
              description: 'Root',
              pathComponent: 'root',
              timestamp: 1234567890,
              width: null,
              height: null,
              thumb_width: null,
              thumb_height: null,
            },
          ],
        });

      const rootId = await findRootAlbumId();

      expect(rootId).toBe(1);
      expect(global.fetch).toHaveBeenCalledWith('/data/7.json');
      expect(global.fetch).toHaveBeenCalledWith('/data/1.json');
    });

    it('returns null if no root found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const rootId = await findRootAlbumId();

      expect(rootId).toBeNull();
    });

    it('handles network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        new TypeError('Network error'),
      );

      const rootId = await findRootAlbumId();

      expect(rootId).toBeNull();
    });
  });

  describe('cache functions', () => {
    it('getCachedData returns null for uncached URL', () => {
      const result = getCachedData('/data/999.json');
      expect(result).toBeNull();
    });

    it('setCachedData and getCachedData work together', () => {
      const mockData: Child[] = [
        {
          id: 10,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Cached',
          description: 'Cached',
          pathComponent: 'cached',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      setCachedData('/data/10.json', mockData);
      const result = getCachedData('/data/10.json');

      expect(result).toEqual(mockData);
    });

    it('clearCache removes all cached data', () => {
      const mockData: Child[] = [
        {
          id: 11,
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

      setCachedData('/data/11.json', mockData);
      clearCache();
      const result = getCachedData('/data/11.json');

      expect(result).toBeNull();
    });
  });

  describe('error types', () => {
    it('DataLoadError has code and cause', () => {
      const cause = new Error('Original error');
      const error = new DataLoadError('Test error', 'TEST_CODE', cause);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.cause).toBe(cause);
      expect(error).toBeInstanceOf(Error);
    });

    it('NetworkError extends DataLoadError', () => {
      const error = new NetworkError('Network failed');

      expect(error).toBeInstanceOf(DataLoadError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('ParseError extends DataLoadError', () => {
      const error = new ParseError('Parse failed');

      expect(error).toBeInstanceOf(DataLoadError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('PARSE_ERROR');
    });

    it('NotFoundError extends DataLoadError', () => {
      const error = new NotFoundError('Not found');

      expect(error).toBeInstanceOf(DataLoadError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('NOT_FOUND');
    });
  });
});
