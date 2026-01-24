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
import type { Child, AlbumFile } from '../../../backend/types';

function albumFile(albumId: number, children: Child[], metadata?: Partial<AlbumFile['metadata']>): AlbumFile {
  return {
    metadata: {
      albumId,
      albumTitle: metadata?.albumTitle ?? 'Test',
      albumDescription: metadata?.albumDescription ?? null,
      albumTimestamp: metadata?.albumTimestamp ?? 0,
      ownerName: metadata?.ownerName ?? null,
    },
    children,
  };
}

describe('dataLoader', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
  });

  describe('loadAlbum', () => {
    it('loads album data successfully', async () => {
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
      const mock = albumFile(1, mockChildren);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mock,
      });

      const result = await loadAlbum(1);

      expect(result.metadata.albumId).toBe(1);
      expect(result.children).toEqual(mockChildren);
      expect(global.fetch).toHaveBeenCalledWith('/data/1.json');
    });

    it('returns cached data if available', async () => {
      const mockChildren: Child[] = [
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
      const mock = albumFile(2, mockChildren);
      setCachedData('/data/2.json', mock);

      const result = await loadAlbum(2);

      expect(result.children).toEqual(mockChildren);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('caches data after successful load', async () => {
      const mockChildren: Child[] = [
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
      const mock = albumFile(3, mockChildren);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mock,
      });

      await loadAlbum(3);

      const cached = getCachedData('/data/3.json');
      expect(cached).not.toBeNull();
      expect(cached!.children).toEqual(mockChildren);
    });

    it('uses cache on second load without calling fetch', async () => {
      const mockChildren: Child[] = [
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
      const mock = albumFile(4, mockChildren);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mock,
      });

      const result1 = await loadAlbum(4);
      expect(result1.children).toEqual(mockChildren);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      vi.mocked(global.fetch).mockClear();
      const result2 = await loadAlbum(4);
      expect(result2.children).toEqual(mockChildren);
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

    it('throws ParseError for non-object data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => 'not an object',
      });

      await expect(loadAlbum(1)).rejects.toThrow(ParseError);
    });

    it('handles empty children array', async () => {
      const mock = albumFile(1, []);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mock,
      });

      const result = await loadAlbum(1);
      expect(result.children).toEqual([]);
      expect(result.metadata.albumId).toBe(1);
    });

    it('accepts JSON with ownerName and summary in children', async () => {
      const mockChildren: Child[] = [
        {
          id: 1,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Album',
          description: 'Desc',
          pathComponent: 'album',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
          ownerName: 'Jane Doe',
          summary: 'Album summary',
        },
        {
          id: 2,
          type: 'GalleryPhotoItem',
          hasChildren: false,
          title: 'Photo',
          description: 'Photo desc',
          pathComponent: 'photo.jpg',
          timestamp: 1234567891,
          width: 800,
          height: 600,
          thumb_width: 200,
          thumb_height: 150,
          ownerName: null,
          summary: null,
        },
      ];
      const mock = albumFile(1, mockChildren);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mock,
      });

      const result = await loadAlbum(1);
      expect(result.children[0].ownerName).toBe('Jane Doe');
      expect(result.children[0].summary).toBe('Album summary');
      expect(result.children[1].ownerName).toBeNull();
      expect(result.children[1].summary).toBeNull();
    });

    it('rejects legacy Child[]-only format', async () => {
      const legacyChildren = [
        {
          id: 5,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Legacy',
          description: 'Legacy desc',
          pathComponent: 'legacy',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => legacyChildren,
      });

      await expect(loadAlbum(5)).rejects.toThrow(ParseError);
      await expect(loadAlbum(5)).rejects.toThrow('Invalid data structure');
    });

    it('accepts JSON with null title, description, or pathComponent in children', async () => {
      const childrenWithNulls = [
        {
          id: 6,
          type: 'GalleryPhotoItem',
          hasChildren: false,
          title: null,
          description: null,
          pathComponent: 'photo.jpg',
          timestamp: 1234567890,
          width: 100,
          height: 100,
          thumb_width: 50,
          thumb_height: 50,
        },
      ];
      const mock = albumFile(6, childrenWithNulls as Child[]);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mock,
      });

      const result = await loadAlbum(6);
      expect(result.children).toHaveLength(1);
      expect(result.children[0].title).toBeNull();
      expect(result.children[0].description).toBeNull();
      expect(result.children[0].pathComponent).toBe('photo.jpg');
    });

    it('accepts JSON with null timestamp in children', async () => {
      const childrenWithNullTimestamp = [
        {
          id: 8,
          type: 'GalleryAlbumItem',
          hasChildren: false,
          title: 'No date',
          description: null,
          pathComponent: 'no-date',
          timestamp: null,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];
      const mock = albumFile(8, childrenWithNullTimestamp as Child[]);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mock,
      });

      const result = await loadAlbum(8);
      expect(result.children).toHaveLength(1);
      expect(result.children[0].timestamp).toBeNull();
    });
  });

  describe('findRootAlbumId', () => {
    it('returns 7 if 7.json exists', async () => {
      const rootChildren: Child[] = [
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
      const rootFile = albumFile(7, rootChildren);
      global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
        if (url?.includes('/data/index.json')) {
          return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
        }
        if (url?.includes('/data/7.json')) {
          return Promise.resolve({ ok: true, json: async () => rootFile });
        }
        return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
      });

      const rootId = await findRootAlbumId();

      expect(rootId).toBe(7);
      expect(global.fetch).toHaveBeenCalledWith('/data/7.json');
    });

    it('tries common root IDs if 7.json not found', async () => {
      const oneChildren: Child[] = [
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
      ];
      const oneFile = albumFile(1, oneChildren);
      global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
        if (url?.includes('/data/index.json')) {
          return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
        }
        if (url?.includes('/data/7.json')) {
          return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
        }
        if (url?.includes('/data/1.json')) {
          return Promise.resolve({ ok: true, json: async () => oneFile });
        }
        return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
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
      const mockChildren: Child[] = [
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
      const mock = albumFile(10, mockChildren);
      setCachedData('/data/10.json', mock);
      const result = getCachedData('/data/10.json');

      expect(result).not.toBeNull();
      expect(result!.children).toEqual(mockChildren);
    });

    it('clearCache removes all cached data', () => {
      const mockChildren: Child[] = [
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
      const mock = albumFile(11, mockChildren);
      setCachedData('/data/11.json', mock);
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
