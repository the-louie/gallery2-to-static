import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchIndex } from './searchIndex';
import { loadSearchIndex } from './searchIndexLoader';
import type { SearchIndexItem } from './searchIndex';

// Mock searchIndexLoader
vi.mock('./searchIndexLoader', () => ({
  loadSearchIndex: vi.fn(),
}));

describe('SearchIndex', () => {
  let searchIndex: SearchIndex;

  beforeEach(() => {
    searchIndex = new SearchIndex();
    vi.clearAllMocks();
  });

  describe('buildIndex', () => {
    it('loads index from pre-built file', async () => {
      const mockIndexData = {
        version: 1,
        generatedAt: '2025-01-01T00:00:00.000Z',
        itemCount: 2,
        items: [
          {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Vacation Album',
            description: 'Photos from vacation',
            pathComponent: 'vacation',
          },
          {
            id: 2,
            type: 'GalleryPhotoItem' as const,
            title: 'Beach Photo',
            description: 'Photo of the beach',
            pathComponent: 'beach.jpg',
          },
        ] as SearchIndexItem[],
      };

      vi.mocked(loadSearchIndex).mockResolvedValue(mockIndexData);

      await searchIndex.buildIndex(7);

      expect(searchIndex.getItemCount()).toBe(2);
      expect(searchIndex.getItem(1)).toBeDefined();
      expect(searchIndex.getItem(2)).toBeDefined();
    });

    it('handles missing index file gracefully', async () => {
      vi.mocked(loadSearchIndex).mockResolvedValue(null);

      // Should not throw
      await expect(searchIndex.buildIndex(7)).resolves.not.toThrow();
      expect(searchIndex.getItemCount()).toBe(0);
    });

    it('handles errors gracefully during index loading', async () => {
      vi.mocked(loadSearchIndex).mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(searchIndex.buildIndex(7)).resolves.not.toThrow();
    });

    it('does not reload index if already loaded', async () => {
      const mockIndexData = {
        version: 1,
        generatedAt: '2025-01-01T00:00:00.000Z',
        itemCount: 1,
        items: [
          {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Test',
            description: 'Test',
            pathComponent: 'test',
          },
        ] as SearchIndexItem[],
      };

      vi.mocked(loadSearchIndex).mockResolvedValue(mockIndexData);

      await searchIndex.buildIndex(7);
      const firstCallCount = vi.mocked(loadSearchIndex).mock.calls.length;

      await searchIndex.buildIndex(7);
      const secondCallCount = vi.mocked(loadSearchIndex).mock.calls.length;

      // Should not call loadSearchIndex again
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const mockIndexData = {
        version: 1,
        generatedAt: '2025-01-01T00:00:00.000Z',
        itemCount: 3,
        items: [
          {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Vacation Album',
            description: 'Photos from vacation',
            pathComponent: 'vacation',
          },
          {
            id: 2,
            type: 'GalleryPhotoItem' as const,
            title: 'Beach Photo',
            description: 'Photo of the beach',
            pathComponent: 'beach.jpg',
          },
          {
            id: 3,
            type: 'GalleryAlbumItem' as const,
            title: 'Family Photos',
            description: 'Family vacation photos',
            pathComponent: 'family',
          },
        ] as SearchIndexItem[],
      };

      vi.mocked(loadSearchIndex).mockResolvedValue(mockIndexData);
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
      const manyItems: SearchIndexItem[] = Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        type: 'GalleryAlbumItem' as const,
        title: `Album ${i + 1}`,
        description: 'Test',
        pathComponent: `album-${i + 1}`,
      }));

      const mockIndexData = {
        version: 1,
        generatedAt: '2025-01-01T00:00:00.000Z',
        itemCount: 150,
        items: manyItems,
      };

      vi.mocked(loadSearchIndex).mockResolvedValue(mockIndexData);
      const largeIndex = new SearchIndex();
      await largeIndex.buildIndex(7);

      const results = largeIndex.search('album');
      expect(results.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getItem', () => {
    beforeEach(async () => {
      const mockIndexData = {
        version: 1,
        generatedAt: '2025-01-01T00:00:00.000Z',
        itemCount: 1,
        items: [
          {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Test Album',
            description: 'Test',
            pathComponent: 'test',
          },
        ] as SearchIndexItem[],
      };

      vi.mocked(loadSearchIndex).mockResolvedValue(mockIndexData);
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
      const mockIndexData = {
        version: 1,
        generatedAt: '2025-01-01T00:00:00.000Z',
        itemCount: 1,
        items: [
          {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Test',
            description: 'Test',
            pathComponent: 'test',
          },
        ] as SearchIndexItem[],
      };

      vi.mocked(loadSearchIndex).mockResolvedValue(mockIndexData);
      await searchIndex.buildIndex(7);

      expect(searchIndex.getItemCount()).toBe(1);

      searchIndex.clear();

      expect(searchIndex.getItemCount()).toBe(0);
      expect(searchIndex.getItem(1)).toBeUndefined();
    });
  });
});
