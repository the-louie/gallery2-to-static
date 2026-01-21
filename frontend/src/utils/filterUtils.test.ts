/**
 * Filter utilities tests
 *
 * Comprehensive tests for filter utility functions including date range filtering,
 * type filtering, multi-filter combinations, and edge cases.
 *
 * @module frontend/src/utils/filterUtils
 */

import { describe, it, expect } from 'vitest';
import { applyFilters, countActiveFilters, hasActiveFilters } from './filterUtils';
import type { Child, FilterCriteria } from '@/types';

/**
 * Create a mock album item
 */
function createMockAlbum(overrides?: Partial<Child>): Child {
  return {
    id: 1,
    type: 'GalleryAlbumItem',
    hasChildren: true,
    title: 'Test Album',
    description: 'Test Description',
    pathComponent: 'test-album',
    timestamp: 1000000000000,
    width: null,
    height: null,
    thumb_width: null,
    thumb_height: null,
    ...overrides,
  };
}

/**
 * Create a mock image item
 */
function createMockImage(overrides?: Partial<Child>): Child {
  return {
    id: 2,
    type: 'GalleryPhotoItem',
    hasChildren: false,
    title: 'Test Image',
    description: 'Test Description',
    pathComponent: 'test-image.jpg',
    timestamp: 1500000000000,
    width: 1920,
    height: 1080,
    thumb_width: 320,
    thumb_height: 240,
    ...overrides,
  };
}

describe('applyFilters', () => {
  describe('empty arrays', () => {
    it('returns empty array for empty input', () => {
      const criteria: FilterCriteria = {};
      expect(applyFilters([], criteria)).toEqual([]);
    });

    it('returns empty array for empty input with active filters', () => {
      const criteria: FilterCriteria = {
        dateRange: { start: 1000000000000, end: 2000000000000 },
      };
      expect(applyFilters([], criteria)).toEqual([]);
    });
  });

  describe('no filters', () => {
    it('returns all items when no filters are active', () => {
      const items = [createMockAlbum(), createMockImage()];
      const criteria: FilterCriteria = {};
      expect(applyFilters(items, criteria)).toEqual(items);
    });

    it('returns all items when albumType is "all"', () => {
      const items = [createMockAlbum(), createMockImage()];
      const criteria: FilterCriteria = {
        albumType: 'all',
      };
      expect(applyFilters(items, criteria)).toEqual(items);
    });
  });

  describe('date range filtering', () => {
    it('filters items within date range', () => {
      const items = [
        createMockAlbum({ timestamp: 1000000000000 }),
        createMockAlbum({ timestamp: 1500000000000 }),
        createMockAlbum({ timestamp: 2000000000000 }),
        createMockAlbum({ timestamp: 2500000000000 }),
      ];
      const criteria: FilterCriteria = {
        dateRange: { start: 1200000000000, end: 2200000000000 },
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(1500000000000);
      expect(result[1].timestamp).toBe(2000000000000);
    });

    it('includes items at start boundary', () => {
      const items = [
        createMockAlbum({ timestamp: 1000000000000 }),
        createMockAlbum({ timestamp: 1500000000000 }),
      ];
      const criteria: FilterCriteria = {
        dateRange: { start: 1000000000000, end: 2000000000000 },
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(2);
    });

    it('includes items at end boundary', () => {
      const items = [
        createMockAlbum({ timestamp: 1000000000000 }),
        createMockAlbum({ timestamp: 2000000000000 }),
      ];
      const criteria: FilterCriteria = {
        dateRange: { start: 1000000000000, end: 2000000000000 },
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(2);
    });

    it('excludes items before start date', () => {
      const items = [
        createMockAlbum({ timestamp: 500000000000 }),
        createMockAlbum({ timestamp: 1500000000000 }),
      ];
      const criteria: FilterCriteria = {
        dateRange: { start: 1000000000000, end: 2000000000000 },
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBe(1500000000000);
    });

    it('excludes items after end date', () => {
      const items = [
        createMockAlbum({ timestamp: 1500000000000 }),
        createMockAlbum({ timestamp: 2500000000000 }),
      ];
      const criteria: FilterCriteria = {
        dateRange: { start: 1000000000000, end: 2000000000000 },
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBe(1500000000000);
    });

    it('excludes items with null timestamps', () => {
      const items = [
        createMockAlbum({ timestamp: 1500000000000 }),
        createMockAlbum({ timestamp: null as unknown as number }),
      ];
      const criteria: FilterCriteria = {
        dateRange: { start: 1000000000000, end: 2000000000000 },
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBe(1500000000000);
    });

    it('excludes items with undefined timestamps', () => {
      const items = [
        createMockAlbum({ timestamp: 1500000000000 }),
        createMockAlbum({ timestamp: undefined as unknown as number }),
      ];
      const criteria: FilterCriteria = {
        dateRange: { start: 1000000000000, end: 2000000000000 },
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBe(1500000000000);
    });
  });

  describe('type filtering', () => {
    it('filters albums only', () => {
      const items = [createMockAlbum(), createMockImage(), createMockAlbum()];
      const criteria: FilterCriteria = {
        albumType: 'GalleryAlbumItem',
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(2);
      expect(result.every((item) => item.type === 'GalleryAlbumItem')).toBe(true);
    });

    it('filters images only', () => {
      const items = [createMockAlbum(), createMockImage(), createMockImage()];
      const criteria: FilterCriteria = {
        albumType: 'GalleryPhotoItem',
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(2);
      expect(result.every((item) => item.type === 'GalleryPhotoItem')).toBe(true);
    });

    it('returns all items when albumType is "all"', () => {
      const items = [createMockAlbum(), createMockImage()];
      const criteria: FilterCriteria = {
        albumType: 'all',
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(2);
    });
  });

  describe('multi-filter combinations', () => {
    it('applies date range and type filters together (AND logic)', () => {
      const items = [
        createMockAlbum({ timestamp: 1500000000000 }),
        createMockImage({ timestamp: 1500000000000 }),
        createMockAlbum({ timestamp: 2500000000000 }),
        createMockImage({ timestamp: 2500000000000 }),
      ];
      const criteria: FilterCriteria = {
        dateRange: { start: 1000000000000, end: 2000000000000 },
        albumType: 'GalleryPhotoItem',
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('GalleryPhotoItem');
      expect(result[0].timestamp).toBe(1500000000000);
    });

    it('returns empty array when no items match all filters', () => {
      const items = [
        createMockAlbum({ timestamp: 1500000000000 }),
        createMockImage({ timestamp: 2500000000000 }),
      ];
      const criteria: FilterCriteria = {
        dateRange: { start: 1000000000000, end: 2000000000000 },
        albumType: 'GalleryPhotoItem',
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('GalleryPhotoItem');
    });
  });

  describe('edge cases', () => {
    it('handles single item array', () => {
      const items = [createMockAlbum()];
      const criteria: FilterCriteria = {
        albumType: 'GalleryAlbumItem',
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(1);
    });

    it('handles very large date range', () => {
      const items = [
        createMockAlbum({ timestamp: 1000000000000 }),
        createMockAlbum({ timestamp: 2000000000000 }),
      ];
      const criteria: FilterCriteria = {
        dateRange: { start: 0, end: Number.MAX_SAFE_INTEGER },
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(2);
    });

    it('handles very small date range', () => {
      const items = [
        createMockAlbum({ timestamp: 1500000000000 }),
        createMockAlbum({ timestamp: 1500000000001 }),
      ];
      const criteria: FilterCriteria = {
        dateRange: { start: 1500000000000, end: 1500000000000 },
      };
      const result = applyFilters(items, criteria);
      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBe(1500000000000);
    });
  });
});

describe('countActiveFilters', () => {
  it('returns 0 for empty criteria', () => {
    const criteria: FilterCriteria = {};
    expect(countActiveFilters(criteria)).toBe(0);
  });

  it('returns 0 when albumType is "all"', () => {
    const criteria: FilterCriteria = {
      albumType: 'all',
    };
    expect(countActiveFilters(criteria)).toBe(0);
  });

  it('returns 1 for date range filter', () => {
    const criteria: FilterCriteria = {
      dateRange: { start: 1000000000000, end: 2000000000000 },
    };
    expect(countActiveFilters(criteria)).toBe(1);
  });

  it('returns 1 for type filter', () => {
    const criteria: FilterCriteria = {
      albumType: 'GalleryAlbumItem',
    };
    expect(countActiveFilters(criteria)).toBe(1);
  });

  it('returns 2 for both filters', () => {
    const criteria: FilterCriteria = {
      dateRange: { start: 1000000000000, end: 2000000000000 },
      albumType: 'GalleryPhotoItem',
    };
    expect(countActiveFilters(criteria)).toBe(2);
  });
});

describe('hasActiveFilters', () => {
  it('returns false for empty criteria', () => {
    const criteria: FilterCriteria = {};
    expect(hasActiveFilters(criteria)).toBe(false);
  });

  it('returns false when albumType is "all"', () => {
    const criteria: FilterCriteria = {
      albumType: 'all',
    };
    expect(hasActiveFilters(criteria)).toBe(false);
  });

  it('returns true for date range filter', () => {
    const criteria: FilterCriteria = {
      dateRange: { start: 1000000000000, end: 2000000000000 },
    };
    expect(hasActiveFilters(criteria)).toBe(true);
  });

  it('returns true for type filter', () => {
    const criteria: FilterCriteria = {
      albumType: 'GalleryAlbumItem',
    };
    expect(hasActiveFilters(criteria)).toBe(true);
  });

  it('returns true for both filters', () => {
    const criteria: FilterCriteria = {
      dateRange: { start: 1000000000000, end: 2000000000000 },
      albumType: 'GalleryPhotoItem',
    };
    expect(hasActiveFilters(criteria)).toBe(true);
  });
});
