import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildBreadcrumbPath,
  clearBreadcrumbCache,
  getParentAlbumId,
} from './breadcrumbPath';
import { loadAlbum, findRootAlbumId } from './dataLoader';
import type { Child, AlbumFile } from '../../../backend/types';

function albumFile(children: Child[]): AlbumFile {
  return {
    metadata: {
      albumId: 0,
      albumTitle: null,
      albumDescription: null,
      albumTimestamp: 0,
      ownerName: null,
    },
    children,
  };
}

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
        .mockResolvedValueOnce(albumFile(rootChildren))
        .mockResolvedValueOnce(albumFile(rootChildren));

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
        .mockResolvedValueOnce(albumFile(rootChildren))
        .mockResolvedValueOnce(albumFile(childChildren))
        .mockResolvedValueOnce(albumFile(childChildren));

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
        .mockResolvedValueOnce(albumFile(rootChildren))
        .mockResolvedValueOnce(albumFile(rootChildren));

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
        .mockResolvedValueOnce(albumFile([]))
        .mockResolvedValueOnce(albumFile([]));

      const path = await buildBreadcrumbPath(orphanedId, rootId);

      // Orphan: path = [orphan] only (no root)
      expect(path.length).toBe(1);
      expect(path[0].id).toBe(orphanedId);
      expect(path[0].title).toContain('Album');
    });

    it('handles network errors gracefully', async () => {
      const rootId = 7;
      const childId = 10;

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockRejectedValue(
        new Error('Network error'),
      );

      // Should not throw; no parent found (orphan path) → path = [child] only
      const path = await buildBreadcrumbPath(childId, rootId);

      expect(path.length).toBeGreaterThanOrEqual(1);
      expect(path[0].id).toBe(childId);
    });

    it('handles invalid album IDs', async () => {
      const rootId = 7;

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockResolvedValue(albumFile([]));

      const path = await buildBreadcrumbPath(-1, rootId);

      // Invalid ID → no parent found (orphan path); path has one item
      expect(path.length).toBeGreaterThanOrEqual(1);
    });

    it('uses fallback title when album metadata not found', async () => {
      const rootId = 7;
      const childId = 10;

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockResolvedValue(albumFile([]));

      const path = await buildBreadcrumbPath(childId, rootId);

      expect(path.length).toBeGreaterThanOrEqual(1);
      const childItem = path.find((item) => item.id === childId);
      expect(childItem?.title).toContain('Album');
    });

    it('caches root album ID', async () => {
      const rootId = 7;

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockResolvedValue(albumFile([]));

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

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockResolvedValue(albumFile(rootChildren));

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
      vi.mocked(loadAlbum).mockResolvedValue(albumFile([]));

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

  describe('getParentAlbumId', () => {
    it('returns null for root album', async () => {
      const rootId = 7;
      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockResolvedValue(albumFile([]));

      const parentId = await getParentAlbumId(rootId);

      expect(parentId).toBeNull();
    });

    it('returns parent album ID when child has known parent', async () => {
      const rootId = 7;
      const childId = 10;
      const rootChildren: Child[] = [
        {
          id: childId,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Child Album',
          description: '',
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
        .mockResolvedValueOnce(albumFile([]))
        .mockResolvedValueOnce(albumFile([]))
        .mockResolvedValueOnce(albumFile(rootChildren))
        .mockResolvedValueOnce(albumFile(rootChildren));

      const parentId = await getParentAlbumId(childId);

      expect(parentId).toBe(rootId);
    });

    it('returns null for orphaned album', async () => {
      const rootId = 7;
      const orphanedId = 999;
      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockResolvedValue(albumFile([]));

      const parentId = await getParentAlbumId(orphanedId);

      expect(parentId).toBeNull();
    });

    it('returns direct parent in multi-level hierarchy (root → A → B)', async () => {
      const rootId = 7;
      const aId = 10;
      const bId = 20;
      const rootChildren: Child[] = [
        {
          id: aId,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Album A',
          description: '',
          pathComponent: 'a',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];
      const aChildren: Child[] = [
        {
          id: bId,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Album B',
          description: '',
          pathComponent: 'b',
          timestamp: 1234567891,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockImplementation((id: number) => {
        if (id === rootId) return Promise.resolve(albumFile(rootChildren));
        if (id === aId) return Promise.resolve(albumFile(aChildren));
        return Promise.resolve(albumFile([]));
      });

      const parentId = await getParentAlbumId(bId);

      expect(parentId).toBe(aId);
    });

    it('returns direct parent in deeply nested hierarchy (root → A → B → C → D)', async () => {
      const rootId = 1;
      const aId = 10;
      const bId = 20;
      const cId = 30;
      const dId = 40;
      const rootChildren: Child[] = [
        {
          id: aId,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'A',
          description: '',
          pathComponent: 'a',
          timestamp: 1,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];
      const aChildren: Child[] = [
        {
          id: bId,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'B',
          description: '',
          pathComponent: 'b',
          timestamp: 2,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];
      const bChildren: Child[] = [
        {
          id: cId,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'C',
          description: '',
          pathComponent: 'c',
          timestamp: 3,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];
      const cChildren: Child[] = [
        {
          id: dId,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'D',
          description: '',
          pathComponent: 'd',
          timestamp: 4,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      vi.mocked(findRootAlbumId).mockResolvedValue(rootId);
      vi.mocked(loadAlbum).mockImplementation((id: number) => {
        if (id === rootId) return Promise.resolve(albumFile(rootChildren));
        if (id === aId) return Promise.resolve(albumFile(aChildren));
        if (id === bId) return Promise.resolve(albumFile(bChildren));
        if (id === cId) return Promise.resolve(albumFile(cChildren));
        return Promise.resolve(albumFile([]));
      });

      const parentId = await getParentAlbumId(dId);

      expect(parentId).toBe(cId);
    });
  });
});
