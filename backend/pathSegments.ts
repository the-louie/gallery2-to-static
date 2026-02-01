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

/**
 * Return segment for an album at a given level, disambiguating if a sibling already uses the same segment.
 * When collision, appends --id so segment is unique and reversible.
 */
export function getSegmentForAlbum(
  title: string | null | undefined,
  id: number,
  usedSegments: Set<string>,
): string {
  const base = titleToSegment(title);
  let segment = base;
  if (usedSegments.has(segment)) {
    segment = `${base}${DISAMBIGUATE_SEP}${id}`;
  }
  usedSegments.add(segment);
  return segment;
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
