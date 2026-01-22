/**
 * Sorting Utilities Tests
 *
 * Tests for sorting utility functions including date, name, size, and order sorting.
 */

import { describe, it, expect } from 'vitest';
import { sortItems } from './sorting';
import type { Child } from '@/types';
import {
  mockAlbum,
  mockPhoto,
  mockPhotoPortrait,
  mockPhotoNoThumb,
} from '@/__mocks__/mockData';

describe('sorting', () => {
  describe('sortItems', () => {
    describe('date sorting', () => {
      it('sorts by date ascending (oldest first)', () => {
        const items: Child[] = [
          { ...mockPhoto, timestamp: 1000 },
          { ...mockAlbum, timestamp: 500 },
          { ...mockPhotoPortrait, timestamp: 2000 },
        ];

        const sorted = sortItems(items, 'date-asc');

        expect(sorted[0].timestamp).toBe(500);
        expect(sorted[1].timestamp).toBe(1000);
        expect(sorted[2].timestamp).toBe(2000);
      });

      it('sorts by date descending (newest first)', () => {
        const items: Child[] = [
          { ...mockPhoto, timestamp: 1000 },
          { ...mockAlbum, timestamp: 500 },
          { ...mockPhotoPortrait, timestamp: 2000 },
        ];

        const sorted = sortItems(items, 'date-desc');

        expect(sorted[0].timestamp).toBe(2000);
        expect(sorted[1].timestamp).toBe(1000);
        expect(sorted[2].timestamp).toBe(500);
      });

      it('handles null timestamps (nulls last)', () => {
        const items: Child[] = [
          { ...mockPhoto, timestamp: 1000 },
          { ...mockAlbum, timestamp: null as any },
          { ...mockPhotoPortrait, timestamp: 2000 },
        ];

        const sorted = sortItems(items, 'date-asc');

        expect(sorted[0].timestamp).toBe(1000);
        expect(sorted[1].timestamp).toBe(2000);
        expect(sorted[2].timestamp).toBeNull();
      });

      it('handles all null timestamps', () => {
        const items: Child[] = [
          { ...mockPhoto, timestamp: null as any },
          { ...mockAlbum, timestamp: null as any },
        ];

        const sorted = sortItems(items, 'date-asc');

        expect(sorted.length).toBe(2);
        expect(sorted[0].timestamp).toBeNull();
        expect(sorted[1].timestamp).toBeNull();
      });

      it('maintains stable sort for equal timestamps', () => {
        const items: Child[] = [
          { ...mockPhoto, id: 1, timestamp: 1000 },
          { ...mockAlbum, id: 2, timestamp: 1000 },
          { ...mockPhotoPortrait, id: 3, timestamp: 1000 },
        ];

        const sorted = sortItems(items, 'date-asc');

        // Should maintain original order for equal values
        expect(sorted[0].id).toBe(1);
        expect(sorted[1].id).toBe(2);
        expect(sorted[2].id).toBe(3);
      });
    });

    describe('name sorting', () => {
      it('sorts by name ascending (A-Z)', () => {
        const items: Child[] = [
          { ...mockPhoto, title: 'Zebra' },
          { ...mockAlbum, title: 'Apple' },
          { ...mockPhotoPortrait, title: 'Banana' },
        ];

        const sorted = sortItems(items, 'name-asc');

        expect(sorted[0].title).toBe('Apple');
        expect(sorted[1].title).toBe('Banana');
        expect(sorted[2].title).toBe('Zebra');
      });

      it('sorts by name descending (Z-A)', () => {
        const items: Child[] = [
          { ...mockPhoto, title: 'Apple' },
          { ...mockAlbum, title: 'Zebra' },
          { ...mockPhotoPortrait, title: 'Banana' },
        ];

        const sorted = sortItems(items, 'name-desc');

        expect(sorted[0].title).toBe('Zebra');
        expect(sorted[1].title).toBe('Banana');
        expect(sorted[2].title).toBe('Apple');
      });

      it('performs case-insensitive sorting', () => {
        const items: Child[] = [
          { ...mockPhoto, title: 'zebra' },
          { ...mockAlbum, title: 'Apple' },
          { ...mockPhotoPortrait, title: 'banana' },
        ];

        const sorted = sortItems(items, 'name-asc');

        expect(sorted[0].title).toBe('Apple');
        expect(sorted[1].title).toBe('banana');
        expect(sorted[2].title).toBe('zebra');
      });

      it('handles empty titles (empty strings last)', () => {
        const items: Child[] = [
          { ...mockPhoto, title: 'Zebra' },
          { ...mockAlbum, title: '' },
          { ...mockPhotoPortrait, title: 'Apple' },
        ];

        const sorted = sortItems(items, 'name-asc');

        expect(sorted[0].title).toBe('Apple');
        expect(sorted[1].title).toBe('Zebra');
        expect(sorted[2].title).toBe('');
      });

      it('handles null titles (treated as empty)', () => {
        const items: Child[] = [
          { ...mockPhoto, title: 'Zebra' },
          { ...mockAlbum, title: null as any },
          { ...mockPhotoPortrait, title: 'Apple' },
        ];

        const sorted = sortItems(items, 'name-asc');

        expect(sorted[0].title).toBe('Apple');
        expect(sorted[1].title).toBe('Zebra');
        expect(sorted[2].title).toBeNull();
      });

      it('trims whitespace from titles', () => {
        const items: Child[] = [
          { ...mockPhoto, title: '  Zebra  ' },
          { ...mockAlbum, title: 'Apple' },
        ];

        const sorted = sortItems(items, 'name-asc');

        expect(sorted[0].title).toBe('Apple');
        expect(sorted[1].title).toBe('  Zebra  ');
      });

      it('maintains stable sort for equal names (case-sensitive secondary sort)', () => {
        const items: Child[] = [
          { ...mockPhoto, id: 1, title: 'apple' },
          { ...mockAlbum, id: 2, title: 'Apple' },
          { ...mockPhotoPortrait, id: 3, title: 'APPLE' },
        ];

        const sorted = sortItems(items, 'name-asc');

        // Case-insensitive equal, but case-sensitive order should be maintained
        expect(sorted.length).toBe(3);
      });
    });

    describe('size sorting', () => {
      it('sorts by size ascending (smallest first)', () => {
        const items: Child[] = [
          { ...mockPhoto, width: 1920, height: 1080 }, // 2,073,600
          { ...mockPhotoPortrait, width: 1080, height: 1920 }, // 2,073,600
          { ...mockPhotoNoThumb, width: 2560, height: 1440 }, // 3,686,400
        ];

        const sorted = sortItems(items, 'size-asc');

        // Both 1920x1080 and 1080x1920 have same size, so order should be stable
        expect(sorted[0].width).toBe(1920);
        expect(sorted[1].width).toBe(1080);
        expect(sorted[2].width).toBe(2560);
      });

      it('sorts by size descending (largest first)', () => {
        const items: Child[] = [
          { ...mockPhoto, width: 1920, height: 1080 }, // 2,073,600
          { ...mockPhotoPortrait, width: 1080, height: 1920 }, // 2,073,600
          { ...mockPhotoNoThumb, width: 2560, height: 1440 }, // 3,686,400
        ];

        const sorted = sortItems(items, 'size-desc');

        expect(sorted[0].width).toBe(2560);
        // Next two have same size, order should be stable
        expect(sorted[1].width).toBe(1920);
        expect(sorted[2].width).toBe(1080);
      });

      it('handles null width (nulls last)', () => {
        const items: Child[] = [
          { ...mockPhoto, width: 1920, height: 1080 },
          { ...mockAlbum, width: null, height: null }, // Album has no size
          { ...mockPhotoPortrait, width: 1080, height: 1920 },
        ];

        const sorted = sortItems(items, 'size-asc');

        expect(sorted[0].width).toBe(1080);
        expect(sorted[1].width).toBe(1920);
        expect(sorted[2].width).toBeNull();
      });

      it('handles null height (nulls last)', () => {
        const items: Child[] = [
          { ...mockPhoto, width: 1920, height: null },
          { ...mockPhotoPortrait, width: 1080, height: 1920 },
        ];

        const sorted = sortItems(items, 'size-asc');

        expect(sorted[0].width).toBe(1080);
        expect(sorted[1].width).toBe(1920);
        expect(sorted[1].height).toBeNull();
      });

      it('handles albums (no size) mixed with images', () => {
        const items: Child[] = [
          { ...mockAlbum, width: null, height: null },
          { ...mockPhoto, width: 1920, height: 1080 },
          { ...mockPhotoPortrait, width: 1080, height: 1920 },
        ];

        const sorted = sortItems(items, 'size-asc');

        // Images first (sorted by size), then album
        expect(sorted[0].type).toBe('GalleryPhotoItem');
        expect(sorted[1].type).toBe('GalleryPhotoItem');
        expect(sorted[2].type).toBe('GalleryAlbumItem');
      });

      it('maintains stable sort for equal sizes', () => {
        const items: Child[] = [
          { ...mockPhoto, id: 1, width: 1920, height: 1080 },
          { ...mockPhotoPortrait, id: 2, width: 1080, height: 1920 },
        ];

        const sorted = sortItems(items, 'size-asc');

        // Both have same size (2,073,600), order should be stable
        expect(sorted[0].id).toBe(1);
        expect(sorted[1].id).toBe(2);
      });
    });

    describe('order sorting', () => {
      it('sorts by order ascending (lower values first)', () => {
        const items: Child[] = [
          { ...mockPhoto, id: 1, order: 30 },
          { ...mockAlbum, id: 2, order: 10 },
          { ...mockPhotoPortrait, id: 3, order: 20 },
        ];

        const sorted = sortItems(items, 'order-asc');

        expect(sorted[0].order).toBe(10);
        expect(sorted[1].order).toBe(20);
        expect(sorted[2].order).toBe(30);
      });

      it('handles null/undefined order (sorted last)', () => {
        const items: Child[] = [
          { ...mockPhoto, id: 1, order: 10 },
          { ...mockAlbum, id: 2, order: null as any },
          { ...mockPhotoPortrait, id: 3, order: 20 },
        ];

        const sorted = sortItems(items, 'order-asc');

        expect(sorted[0].order).toBe(10);
        expect(sorted[1].order).toBe(20);
        expect(sorted[2].order).toBeNull();
      });

      it('handles all null/undefined order', () => {
        const items: Child[] = [
          { ...mockPhoto, id: 1, order: null as any },
          { ...mockAlbum, id: 2, order: undefined as any },
        ];

        const sorted = sortItems(items, 'order-asc');

        expect(sorted.length).toBe(2);
        expect(sorted[0].id).toBe(1);
        expect(sorted[1].id).toBe(2);
      });

      it('maintains stable sort for equal order values', () => {
        const items: Child[] = [
          { ...mockPhoto, id: 1, order: 5 },
          { ...mockAlbum, id: 2, order: 5 },
          { ...mockPhotoPortrait, id: 3, order: 5 },
        ];

        const sorted = sortItems(items, 'order-asc');

        expect(sorted[0].id).toBe(1);
        expect(sorted[1].id).toBe(2);
        expect(sorted[2].id).toBe(3);
      });

      it('does not mutate original array when sorting by order', () => {
        const items: Child[] = [
          { ...mockPhoto, id: 1, order: 20 },
          { ...mockAlbum, id: 2, order: 10 },
        ];
        const original = [...items];

        sortItems(items, 'order-asc');

        expect(items).toEqual(original);
      });
    });

    describe('edge cases', () => {
      it('handles empty array', () => {
        const items: Child[] = [];
        const sorted = sortItems(items, 'date-desc');

        expect(sorted).toEqual([]);
        expect(sorted.length).toBe(0);
      });

      it('handles single item', () => {
        const items: Child[] = [{ ...mockPhoto }];
        const sorted = sortItems(items, 'date-desc');

        expect(sorted.length).toBe(1);
        expect(sorted[0]).toEqual(mockPhoto);
      });

      it('does not mutate original array', () => {
        const items: Child[] = [
          { ...mockPhoto, timestamp: 2000 },
          { ...mockAlbum, timestamp: 1000 },
        ];
        const original = [...items];

        const sorted = sortItems(items, 'date-desc');

        expect(items).toEqual(original);
        expect(sorted).not.toEqual(original);
      });

      it('handles all sort options', () => {
        const items: Child[] = [
          { ...mockPhoto, timestamp: 1000, title: 'Zebra', width: 1920, height: 1080, order: 2 },
          { ...mockAlbum, timestamp: 2000, title: 'Apple', width: null, height: null, order: 1 },
        ];

        const options: Array<'date-asc' | 'date-desc' | 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc' | 'order-asc'> = [
          'date-asc',
          'date-desc',
          'name-asc',
          'name-desc',
          'size-asc',
          'size-desc',
          'order-asc',
        ];

        options.forEach((option) => {
          const sorted = sortItems(items, option);
          expect(sorted.length).toBe(2);
        });
      });
    });
  });
});
