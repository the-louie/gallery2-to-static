/**
 * The images of an album as the grid shows them: filtered by the active criteria, then sorted.
 * Shared by ImageGrid and the lightbox (ImageDetailPage), so next/previous and "N of M" follow
 * the grid's order and filters (LOGIC-16).
 */

import { isImage } from '@/types';
import type { Child, FilterCriteria, Image, SortOption } from '@/types';
import { applyFilters } from './filterUtils';
import { sortItems } from './sorting';

export function getVisibleImages(
  items: Child[] | null | undefined,
  criteria: FilterCriteria,
  sortOption: SortOption | null | undefined,
): Image[] {
  const all = (items ?? []).filter(isImage);
  if (all.length === 0) return all;
  const filtered = applyFilters(all as Child[], criteria).filter(isImage) as Image[];
  return filtered.length > 0 && sortOption ? (sortItems(filtered, sortOption) as Image[]) : filtered;
}
