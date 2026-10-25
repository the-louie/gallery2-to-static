import { describe, it, expect } from 'vitest';
import { getVisibleImages } from './visibleImages';
import type { Child, FilterCriteria } from '@/types';

const photo = (id: number, title: string, timestamp: number): Child =>
  ({ id, type: 'GalleryPhotoItem', hasChildren: false, title, pathComponent: `p${id}.jpg`, timestamp }) as Child;
const album = (id: number): Child => ({ id, type: 'GalleryAlbumItem', hasChildren: true, title: 'A', pathComponent: 'a' }) as Child;

const items: Child[] = [photo(1, 'b', 300), album(9), photo(2, 'a', 100), photo(3, 'c', 200)];
const none: FilterCriteria = {};

describe('getVisibleImages (LOGIC-16)', () => {
  it('returns only images, in JSON order without a sort', () => {
    expect(getVisibleImages(items, none, null).map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it('applies the sort the grid uses', () => {
    expect(getVisibleImages(items, none, 'date-desc').map((i) => i.id)).toEqual([1, 3, 2]);
    expect(getVisibleImages(items, none, 'name-asc').map((i) => i.id)).toEqual([2, 1, 3]);
  });

  it('applies the active filters, so "N of M" counts only visible images', () => {
    const criteria: FilterCriteria = { dateRange: { start: 150, end: 350 } };
    expect(getVisibleImages(items, criteria, 'date-asc').map((i) => i.id)).toEqual([3, 1]);
  });

  it('handles missing data', () => {
    expect(getVisibleImages(null, none, 'date-desc')).toEqual([]);
  });
});
