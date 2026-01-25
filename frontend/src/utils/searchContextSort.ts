/**
 * Search context tier sort
 *
 * When the user searches from an album page, results are ordered by relevance
 * to that album: Tier 1 = direct children, Tier 2 = other descendants, Tier 3 = rest.
 * This module provides a pure function used by useSearch when context album ID is set (from URL ?album=).
 */

import type { SearchResult, SearchIndexItem } from './searchIndex';

/**
 * Classify a result into tier 1 (direct child of context), 2 (descendant), or 3 (other).
 * Walks parent chain via getItem; root items or missing parentId → tier 3.
 */
function getTier(
  result: SearchResult,
  contextAlbumId: number,
  getItem: (id: number) => SearchIndexItem | undefined,
): 1 | 2 | 3 {
  const parentId = result.item.parentId;
  if (parentId === undefined) {
    return 3;
  }
  if (parentId === contextAlbumId) {
    return 1;
  }
  const visited = new Set<number>();
  let currentId: number | undefined = parentId;
  while (currentId !== undefined) {
    if (visited.has(currentId)) {
      return 3;
    }
    visited.add(currentId);
    const parent = getItem(currentId);
    if (!parent) {
      return 3;
    }
    if (parent.id === contextAlbumId) {
      return 2;
    }
    currentId = parent.parentId;
  }
  return 3;
}

/**
 * Sort search results by context album tier, preserving within-tier order.
 *
 * Used when user searches from an album page (?album=id): Tier 1 = direct children
 * of that album, Tier 2 = other descendants (in subtree), Tier 3 = rest of site.
 * Within each tier, the existing relevance+title order is preserved (stable sort).
 *
 * @param results - Search results from index.search() (score + title order)
 * @param contextAlbumId - Album ID from URL param ?album= (e.g. current page)
 * @param getItem - Function to resolve index item by ID (e.g. index.getItem)
 * @returns New array sorted by tier then original order; input array is not mutated
 */
export function sortSearchResultsByContextTier(
  results: SearchResult[],
  contextAlbumId: number,
  getItem: (id: number) => SearchIndexItem | undefined,
): SearchResult[] {
  const withTier = results.map((r) => ({
    result: r,
    tier: getTier(r, contextAlbumId, getItem),
  }));
  withTier.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }
    return 0;
  });
  return withTier.map((x) => x.result);
}
