import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildBreadcrumbPath,
  clearBreadcrumbCache,
} from './breadcrumbPath';
import { loadAlbum, findRootAlbumId } from './dataLoader';
import type { Child } from '../../../types';

// Mock the dataLoader module
vi.mock('./dataLoader', () => ({
  loadAlbum: vi.fn(),
  findRootAlbumId: vi.fn(),
}));

// Mock the albumMetadata module
vi.mock('./albumMetadata', () => ({
  getAlbumMetadata: vi.fn((albumId: number, children: Child[]) => {
    return children.find(
      (child) => child.id === albumId && child.type === 'GalleryAlbumItem',
    ) || null;
  }),
}));

describe('breadcrumbPath', () => {
  beforeEach(() => {
    clearBreadcrumbCache();
    vi.clearAllMocks();
  });

  describe('buildBreadcrumbPath', () => {
    it('returns home breadcrumb for root album', async () => {
      const rootId = 7;
      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);

      const path = await buildBreadcrumbPath(rootId, rootId);

      expect(path).toEqual([
        {
          id: rootId,
          title: 'Home',
          path: '/',
        },
      ]);
    });

    it('returns path with root and child for simple hierarchy', async () => {
      const rootId = 7;
      const childId = 10;

      const rootChildren: Child[] = [
        {
          id: childId,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Child Album',
          description: 'Child description',
          pathComponent: 'child',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum)
        .mockResolvedValueOnce(rootChildren) // For finding parent of childId
        .mockResolvedValueOnce(rootChildren); // For getting child metadata

      const path = await buildBreadcrumbPath(childId, rootId);

      expect(path).toEqual([
        {
          id: rootId,
          title: 'Home',
          path: '/',
        },
        {
          id: childId,
          title: 'Child Album',
          path: `/album/${childId}`,
        },
      ]);
    });

    it('returns path for nested hierarchy (root -> child -> grandchild)', async () => {
      const rootId = 7;
      const childId = 10;
      const grandchildId = 20;

      const rootChildren: Child[] = [
        {
          id: childId,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Child Album',
          description: 'Child description',
          pathComponent: 'child',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      const childChildren: Child[] = [
        {
          id: grandchildId,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Grandchild Album',
          description: 'Grandchild description',
          pathComponent: 'grandchild',
          timestamp: 1234567891,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum)
        .mockResolvedValueOnce(rootChildren) // For finding parent of grandchildId (try rootId)
        .mockResolvedValueOnce(childChildren) // For finding parent of grandchildId (try childId)
        .mockResolvedValueOnce(childChildren); // For getting grandchild metadata

      const path = await buildBreadcrumbPath(grandchildId, rootId);

      expect(path.length).toBeGreaterThanOrEqual(2);
      expect(path[0]).toEqual({
        id: rootId,
        title: 'Home',
        path: '/',
      });
      expect(path[path.length - 1]).toEqual({
        id: grandchildId,
        title: 'Grandchild Album',
        path: `/album/${grandchildId}`,
      });
    });

    it('discovers root album ID if not provided', async () => {
      const rootId = 7;
      const childId = 10;

      const rootChildren: Child[] = [
        {
          id: childId,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Child Album',
          description: 'Child description',
          pathComponent: 'child',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum)
        .mockResolvedValueOnce(rootChildren)
        .mockResolvedValueOnce(rootChildren);

      const path = await buildBreadcrumbPath(childId);

      expect(path.length).toBeGreaterThanOrEqual(2);
      expect(path[0].id).toBe(rootId);
      expect(findRootAlbumId).toHaveBeenCalled();
    });

    it('returns empty array if root album cannot be discovered', async () => {
      vi.mocked(findRootAlbumId).mockResolvedValue(null);

      const path = await buildBreadcrumbPath(10);

      expect(path).toEqual([]);
    });

    it('handles orphaned album (no parent found)', async () => {
      const rootId = 7;
      const orphanedId = 999;

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum)
        .mockResolvedValueOnce([]) // Root children (orphaned not found)
        .mockResolvedValueOnce([]); // Try to get metadata from root

      const path = await buildBreadcrumbPath(orphanedId, rootId);

      // Should still return a path with root and orphaned album
      expect(path.length).toBeGreaterThanOrEqual(2);
      expect(path[0].id).toBe(rootId);
      expect(path[path.length - 1].id).toBe(orphanedId);
      expect(path[path.length - 1].title).toContain('Album');
    });

    it('handles network errors gracefully', async () => {
      const rootId = 7;
      const childId = 10;

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockRejectedValue(
        new Error('Network error'),
      );

      // Should not throw, but return a path with fallback
      const path = await buildBreadcrumbPath(childId, rootId);

      // Should return at least root
      expect(path.length).toBeGreaterThanOrEqual(1);
      expect(path[0].id).toBe(rootId);
    });

    it('handles invalid album IDs', async () => {
      const rootId = 7;

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockResolvedValue([]);

      const path = await buildBreadcrumbPath(-1, rootId);

      // Should return at least root
      expect(path.length).toBeGreaterThanOrEqual(1);
    });

    it('uses fallback title when album metadata not found', async () => {
      const rootId = 7;
      const childId = 10;

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockResolvedValue([]); // Empty children

      const path = await buildBreadcrumbPath(childId, rootId);

      expect(path.length).toBeGreaterThanOrEqual(2);
      const childItem = path.find((item) => item.id === childId);
      expect(childItem?.title).toContain('Album');
    });

    it('caches root album ID', async () => {
      const rootId = 7;

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockResolvedValue([]);

      // First call
      await buildBreadcrumbPath(10, undefined);
      expect(findRootAlbumId).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await buildBreadcrumbPath(20, undefined);
      expect(findRootAlbumId).toHaveBeenCalledTimes(1);
    });

    it('prevents infinite loops with circular references', async () => {
      const rootId = 7;
      const childId = 10;

      const rootChildren: Child[] = [
        {
          id: childId,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Child',
          description: 'Child',
          pathComponent: 'child',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      // Simulate circular reference by making child point to itself
      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockResolvedValue(rootChildren);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const path = await buildBreadcrumbPath(childId, rootId);

      // Should detect circular reference and break
      expect(consoleSpy).toHaveBeenCalled();
      expect(path.length).toBeGreaterThanOrEqual(1);

      consoleSpy.mockRestore();
    });
  });

  describe('clearBreadcrumbCache', () => {
    it('clears root album ID cache', async () => {
      const rootId = 7;

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockResolvedValue([]);

      // First call - should cache
      await buildBreadcrumbPath(10, undefined);
      expect(findRootAlbumId).toHaveBeenCalledTimes(1);

      // Clear cache
      clearBreadcrumbCache();

      // Second call - should discover again
      await buildBreadcrumbPath(20, undefined);
      expect(findRootAlbumId).toHaveBeenCalledTimes(2);
    });
  });
});
