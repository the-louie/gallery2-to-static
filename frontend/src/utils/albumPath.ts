/**
 * Path-based album URL utilities. Must match backend path segment logic for paths built from titles.
 * When backend emits path on child albums, prefer child.path over building from title.
 *
 * ## COUPLING: backend/cleanupUipath.ts
 *
 * titleToSegment() is a simplified version of the backend's cleanup_uipathcomponent().
 * It omits unidecode transliteration (not needed for pre-decoded titles from JSON).
 * For common inputs (Nordic chars, spaces, illegal URL chars), the output must be
 * identical. Shared test vectors in /test-vectors/nordic-path-normalization.json
 * validate this contract. If you change normalization logic here, update the backend
 * and test vectors to match.
 */

import type { BreadcrumbPath } from '@/types';

/** Illegal URL characters replaced with underscore. No bare hyphen inside the class (would create a char range). */
const RE_ILLEGAL = /[\[\]\\\/\?%:|"'><#\s&]/gi;
/** BBCode markup tags, stripped defensively (titles are pre-stripped by backend). */
const RE_MARKUP = /\[.*?\]/g;

/** Standard HTML entities unescaped before path normalization. */
const HTML_ENTITIES: [RegExp, string][] = [
  [/&amp;/gi, '&'],
  [/&lt;/gi, '<'],
  [/&gt;/gi, '>'],
  [/&quot;/gi, '"'],
  [/&#39;/gi, "'"],
];

/** Unescape the five standard HTML entities. Defensive for pre-decoded titles. */
function unescapeBasicHtml(s: string): string {
  let x = s;
  for (const [re, rep] of HTML_ENTITIES) {
    re.lastIndex = 0;
    x = x.replace(re, rep);
  }
  return x;
}

const NORDIC: [RegExp, string][] = [
  [/&ouml;/gi, 'o'],
  [/&auml;/gi, 'a'],
  [/&aring;/gi, 'a'],
  [/&ouml(?!;)/gi, 'o'],
  [/&auml(?!;)/gi, 'a'],
  [/&aring(?!;)/gi, 'a'],
];
const NORDIC_UNICODE: [string, string][] = [
  ['å', 'a'], ['ä', 'a'], ['ö', 'o'],
  ['Å', 'a'], ['Ä', 'a'], ['Ö', 'o'],
];

function normalizeNordic(s: string): string {
  let x = s;
  for (const [re, rep] of NORDIC) {
    re.lastIndex = 0;
    x = x.replace(re, rep);
  }
  for (const [char, rep] of NORDIC_UNICODE) {
    x = x.split(char).join(rep);
  }
  return x;
}

/**
 * Convert album title to URL-safe segment. Matches backend cleanup_uipathcomponent output (lowercase, illegal → _, Nordic → ASCII).
 */
export function titleToSegment(title: string | null | undefined, _id?: number): string {
  if (title == null) return '';
  let x = String(title).replace(/\0/g, '');
  RE_MARKUP.lastIndex = 0;
  x = x.replace(RE_MARKUP, '');
  x = unescapeBasicHtml(x);
  x = normalizeNordic(x);
  RE_ILLEGAL.lastIndex = 0;
  x = x.replace(RE_ILLEGAL, '_');
  x = x.replace(/__/g, '_').replace(/_-_/g, '-');
  x = x.toLowerCase();
  x = normalizeNordic(x);
  return x;
}

/**
 * Album path from breadcrumb: last item's path, or '/' for root/empty.
 */
export function getAlbumPath(breadcrumbPath: BreadcrumbPath): string {
  if (!breadcrumbPath || breadcrumbPath.length === 0) return '/';
  const last = breadcrumbPath[breadcrumbPath.length - 1];
  return last.path ?? '/';
}

/**
 * Image path: album path + /image/{imageId}.
 */
export function getImagePath(breadcrumbPath: BreadcrumbPath, imageId: number): string {
  const albumPath = getAlbumPath(breadcrumbPath);
  const base = albumPath === '/' ? '' : albumPath.replace(/\/+$/, '');
  return base ? `${base}/image/${imageId}` : `/image/${imageId}`;
}

/**
 * Path for an album (e.g. root child). Prefer album.path when backend emits it; otherwise build from title.
 */
export function getAlbumPathFromAlbum(album: { path?: string | null; title?: string | null }): string {
  if (album.path != null && album.path !== '') return album.path;
  return `/${titleToSegment(album.title)}`;
}

/**
 * Path for a child album. Prefer childPath when backend emits it; otherwise build from parent breadcrumb + child title (and id for disambiguation fallback).
 */
export function getChildAlbumPath(
  parentBreadcrumbPath: BreadcrumbPath,
  childTitle: string | null | undefined,
  childId: number,
  childPath?: string | null,
): string {
  if (childPath != null && childPath !== '') return childPath;
  const parentPath = getAlbumPath(parentBreadcrumbPath);
  const segment = titleToSegment(childTitle);
  const base = parentPath === '/' ? '' : parentPath.replace(/\/+$/, '');
  const path = base ? `${base}/${segment}` : `/${segment}`;
  return path;
}
