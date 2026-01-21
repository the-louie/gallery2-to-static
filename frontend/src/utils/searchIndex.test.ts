import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchIndex } from './searchIndex';
import { loadAlbum } from './dataLoader';
import type { Child } from '../../../types';

// Mock dataLoader
vi.mock('./dataLoader', () => ({
  loadAlbum: vi.fn(),
}));

describe('SearchIndex', () => {
  let searchIndex: SearchIndex;

  beforeEach(() => {
    searchIndex = new SearchIndex();
    vi.clearAllMocks();
  });

  describe('buildIndex', () => {
    it('builds index from album data', async () => {
      const mockChildren: Child[] = [
        {
          id: 1,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Vacation Album',
          description: 'Photos from vacation',
          pathComponent: 'vacation',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
        {
          id: 2,
          type: 'GalleryPhotoItem',
          hasChildren: false,
          title: 'Beach Photo',
          description: 'Photo of the beach',
          pathComponent: 'beach.jpg',
          timestamp: 1234567890,
          width: 1920,
          height: 1080,
          thumb_width: 200,
          thumb_height: 150,
        },
      ];

      vi.mocked(loadAlbum).mockResolvedValue(mockChildren);

      await searchIndex.buildIndex(7);

      expect(searchIndex.getItemCount()).toBe(2);
      expect(searchIndex.getItem(1)).toBeDefined();
      expect(searchIndex.getItem(2)).toBeDefined();
    });

    it('recursively builds index from nested albums', async () => {
      const rootChildren: Child[] = [
        {
          id: 1,
          type: 'GalleryAlbumItem',
          hasChildren: true,
          title: 'Parent Album',
          description: 'Parent description',
          pathComponent: 'parent',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      const childChildren: Child[] = [
        {
          id: 2,
          type: 'GalleryPhotoItem',
          hasChildren: false,
          title: 'Child Photo',
          description: 'Child description',
          pathComponent: 'child.jpg',
          timestamp: 1234567890,
          width: 1920,
          height: 1080,
          thumb_width: 200,
          thumb_height: 150,
        },
      ];

      vi.mocked(loadAlbum)
        .mockResolvedValueOnce(rootChildren)
        .mockResolvedValueOnce(childChildren);

      await searchIndex.buildIndex(7);

      expect(searchIndex.getItemCount()).toBe(2);
      expect(searchIndex.getItem(1)).toBeDefined();
      expect(searchIndex.getItem(2)).toBeDefined();
    });

    it('handles errors gracefully during index building', async () => {
      vi.mocked(loadAlbum).mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(searchIndex.buildIndex(7)).resolves.not.toThrow();
    });

    it('does not rebuild index if already built', async () => {
      const mockChildren: Child[] = [
        {
          id: 1,
          type: 'GalleryAlbumItem',
          hasChildren: false,
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

      vi.mocked(loadAlbum).mockResolvedValue(mockChildren);

      await searchIndex.buildIndex(7);
      const firstCallCount = vi.mocked(loadAlbum).mock.calls.length;

      await searchIndex.buildIndex(7);
      const secondCallCount = vi.mocked(loadAlbum).mock.calls.length;

      // Should not call loadAlbum again
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const mockChildren: Child[] = [
        {
          id: 1,
          type: 'GalleryAlbumItem',
          hasChildren: false,
          title: 'Vacation Album',
          description: 'Photos from vacation',
          pathComponent: 'vacation',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
        {
          id: 2,
          type: 'GalleryPhotoItem',
          hasChildren: false,
          title: 'Beach Photo',
          description: 'Photo of the beach',
          pathComponent: 'beach.jpg',
          timestamp: 1234567890,
          width: 1920,
          height: 1080,
          thumb_width: 200,
          thumb_height: 150,
        },
        {
          id: 3,
          type: 'GalleryAlbumItem',
          hasChildren: false,
          title: 'Family Photos',
          description: 'Family vacation photos',
          pathComponent: 'family',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      vi.mocked(loadAlbum).mockResolvedValue(mockChildren);
      await searchIndex.buildIndex(7);
    });

    it('returns empty array for empty query', () => {
      const results = searchIndex.search('');
      expect(results).toEqual([]);
    });

    it('returns empty array for whitespace-only query', () => {
      const results = searchIndex.search('   ');
      expect(results).toEqual([]);
    });

    it('finds results by title', () => {
      const results = searchIndex.search('vacation');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.title.toLowerCase()).toContain('vacation');
    });

    it('finds results by description', () => {
      const results = searchIndex.search('beach');
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some(
          r =>
            r.item.description.toLowerCase().includes('beach') ||
            r.item.title.toLowerCase().includes('beach'),
        ),
      ).toBe(true);
    });

    it('performs case-insensitive search', () => {
      const results = searchIndex.search('VACATION');
      expect(results.length).toBeGreaterThan(0);
    });

    it('sorts results by relevance (title matches first)', () => {
      const results = searchIndex.search('vacation');
      // Title matches should come before description matches
      const titleMatches = results.filter(r => r.matchedInTitle);
      const descriptionMatches = results.filter(
        r => !r.matchedInTitle && r.matchedInDescription,
      );
      expect(titleMatches.length).toBeGreaterThan(0);
      if (descriptionMatches.length > 0) {
        expect(titleMatches[0].score).toBeGreaterThan(
          descriptionMatches[0].score,
        );
      }
    });

    it('limits results to 100', async () => {
      // Create index with more than 100 items
      const manyItems: Child[] = Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        type: 'GalleryAlbumItem',
        hasChildren: false,
        title: `Album ${i + 1}`,
        description: 'Test',
        pathComponent: `album-${i + 1}`,
        timestamp: 1234567890,
        width: null,
        height: null,
        thumb_width: null,
        thumb_height: null,
      }));

      vi.mocked(loadAlbum).mockResolvedValue(manyItems);
      const largeIndex = new SearchIndex();
      await largeIndex.buildIndex(7);

      const results = largeIndex.search('album');
      expect(results.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getItem', () => {
    beforeEach(async () => {
      const mockChildren: Child[] = [
        {
          id: 1,
          type: 'GalleryAlbumItem',
          hasChildren: false,
          title: 'Test Album',
          description: 'Test',
          pathComponent: 'test',
          timestamp: 1234567890,
          width: null,
          height: null,
          thumb_width: null,
          thumb_height: null,
        },
      ];

      vi.mocked(loadAlbum).mockResolvedValue(mockChildren);
      await searchIndex.buildIndex(7);
    });

    it('returns item by ID', () => {
      const item = searchIndex.getItem(1);
      expect(item).toBeDefined();
      expect(item?.id).toBe(1);
      expect(item?.title).toBe('Test Album');
    });

    it('returns undefined for non-existent ID', () => {
      const item = searchIndex.getItem(999);
      expect(item).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('clears the index', async () => {
      const mockChildren: Child[] = [
        {
          id: 1,
          type: 'GalleryAlbumItem',
          hasChildren: false,
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

      vi.mocked(loadAlbum).mockResolvedValue(mockChildren);
      await searchIndex.buildIndex(7);

      expect(searchIndex.getItemCount()).toBe(1);

      searchIndex.clear();

      expect(searchIndex.getItemCount()).toBe(0);
      expect(searchIndex.getItem(1)).toBeUndefined();
    });
  });
});
