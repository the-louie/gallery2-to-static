/**
 * Path segment utilities for path-based album URLs.
 * Uses cleanup_uipathcomponent for human-readable segments; disambiguates duplicate sibling titles with --id.
 */

import { cleanup_uipathcomponent } from './cleanupUipath';
import type { BreadcrumbItem } from './types';

const DISAMBIGUATE_SEP = '--';

/**
 * Convert album title to a URL-safe segment (human-readable, matches breadcrumb).
 * Uses cleanup_uipathcomponent: lowercase, illegal chars → _, no spaces in output.
 */
export function titleToSegment(title: string | null | undefined, _id?: number): string {
  return cleanup_uipathcomponent(title ?? '');
}

/** Segment used when a title gives no usable segment: same form as the `Album <id>` title fallback. */
export function fallbackSegment(id: number): string {
  return `album_${id}`;
}

/**
 * True when a segment cannot be used in a path: empty (the path would collapse to the parent's) or
 * `.` / `..` (browsers and URL parsers normalise them away, so the link would open another album).
 */
export function isUnusableSegment(segment: string): boolean {
  return segment === '' || segment === '.' || segment === '..';
}

/**
 * Return segment for an album at a given level, disambiguating if a sibling already uses the same segment.
 * When collision, appends --id so segment is unique and reversible; if that is taken too (a sibling
 * whose title already reads "<base>--<id>"), appends --2, --3, ... until unique.
 * Titles that give an unusable segment ('' , '.', '..') use fallbackSegment(id).
 */
export function getSegmentForAlbum(
  title: string | null | undefined,
  id: number,
  usedSegments: Set<string>,
): string {
  const cleaned = titleToSegment(title);
  const base = isUnusableSegment(cleaned) ? fallbackSegment(id) : cleaned;
  let segment = base;
  if (usedSegments.has(segment)) {
    segment = `${base}${DISAMBIGUATE_SEP}${id}`;
    for (let n = 2; usedSegments.has(segment); n++) {
      segment = `${base}${DISAMBIGUATE_SEP}${id}${DISAMBIGUATE_SEP}${n}`;
    }
  }
  usedSegments.add(segment);
  return segment;
}

/**
 * Add an album to the path index. Throws if the path already belongs to a different album: an
 * overwrite would make the earlier album unreachable (LOGIC-11), so it must fail loudly instead.
 */
export function addToPathIndex(pathIndex: Map<string, number>, path: string, albumId: number): void {
  const existing = pathIndex.get(path);
  if (existing !== undefined && existing !== albumId) {
    throw new Error(`Path index collision: "${path}" is album ${existing} and album ${albumId}`);
  }
  pathIndex.set(path, albumId);
}

/**
 * Build path string from breadcrumb: returns the last item's path, or '/' for empty/root-only.
 * Backend sets path on each BreadcrumbItem to the path-based URL when building the tree.
 */
export function buildPathFromBreadcrumb(breadcrumbPath: BreadcrumbItem[]): string {
  if (breadcrumbPath.length === 0) return '/';
  const last = breadcrumbPath[breadcrumbPath.length - 1];
  return last.path ?? '/';
}

/**
 * Append a segment to a parent path. Root parent path is '' or '/'; result is normalized (leading /, no double slashes).
 */
export function appendSegment(parentPath: string, segment: string): string {
  const base = parentPath === '' || parentPath === '/' ? '' : parentPath.replace(/\/+$/, '');
  if (!segment) return base || '/';
  return base ? `${base}/${segment}` : `/${segment}`;
}
