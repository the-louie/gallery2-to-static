/**
 * searchContextSort unit tests
 *
 * Tier 1 = direct child of context, Tier 2 = descendant, Tier 3 = other.
 */

import { describe, it, expect, vi } from 'vitest';
import { sortSearchResultsByContextTier } from './searchContextSort';
import type { SearchResult, SearchIndexItem } from './searchIndex';

function makeResult(
  id: number,
  parentId: number | undefined,
  title: string,
): SearchResult {
  return {
    item: {
      id,
      type: 'GalleryAlbumItem',
      title,
      pathComponent: title,
      parentId,
    },
    score: 10,
    matchedInTitle: true,
    matchedInDescription: false,
  };
}

describe('sortSearchResultsByContextTier', () => {
  const contextAlbumId = 100;

  it('orders results by tier: direct child first, then descendant, then other', () => {
    const child = makeResult(201, contextAlbumId, 'Child');
    const descendant = makeResult(202, 201, 'Descendant');
    const other = makeResult(301, 999, 'Other');

    const getItem = vi.fn((id: number): SearchIndexItem | undefined => {
      if (id === 201) return child.item;
      if (id === 100) return { id: 100, type: 'GalleryAlbumItem', title: 'Context', pathComponent: 'ctx', parentId: undefined };
      if (id === 999) return { ...other.item, id: 999, parentId: undefined };
      return undefined;
    });

    const results: SearchResult[] = [other, descendant, child];
    const sorted = sortSearchResultsByContextTier(results, contextAlbumId, getItem);

    expect(sorted.map((r) => r.item.id)).toEqual([201, 202, 301]);
  });

  it('preserves within-tier order (stable sort)', () => {
    const a = makeResult(101, contextAlbumId, 'A');
    const b = makeResult(102, contextAlbumId, 'B');
    const results: SearchResult[] = [b, a];
    const getItem = vi.fn();

    const sorted = sortSearchResultsByContextTier(results, contextAlbumId, getItem);

    expect(sorted.map((r) => r.item.id)).toEqual([102, 101]);
  });

  it('treats missing parentId as tier 3', () => {
    const noParent = makeResult(1, undefined, 'NoParent');
    const getItem = vi.fn();

    const sorted = sortSearchResultsByContextTier([noParent], contextAlbumId, getItem);

    expect(sorted.length).toBe(1);
    expect(sorted[0].item.id).toBe(1);
  });

  it('treats getItem returning undefined as tier 3', () => {
    const orphan = makeResult(50, 999, 'Orphan');
    const getItem = vi.fn(() => undefined);

    const sorted = sortSearchResultsByContextTier([orphan], contextAlbumId, getItem);

    expect(sorted.length).toBe(1);
    expect(sorted[0].item.id).toBe(50);
  });

  it('does not mutate input array', () => {
    const child = makeResult(201, contextAlbumId, 'Child');
    const other = makeResult(301, 999, 'Other');
    const results: SearchResult[] = [other, child];
    const getItem = vi.fn((id: number) => (id === 999 ? { id: 999, type: 'GalleryAlbumItem' as const, title: 'X', pathComponent: 'x', parentId: undefined } : undefined));

    sortSearchResultsByContextTier(results, contextAlbumId, getItem);

    expect(results[0].item.id).toBe(301);
    expect(results[1].item.id).toBe(201);
  });
});
