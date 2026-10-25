/**
 * View identity for cache clearing and fetch aborting (PERF-03).
 *
 * Stepping through the lightbox changes the URL on every image (`/album/7/image/12` →
 * `/album/7/image/13`, or `/x/y/image/12` → `/x/y/image/13`), but it is the same album view: the
 * neighbour images preloaded for the lightbox must survive the step. The view key is the pathname
 * without a trailing `/image/<id>`, so it changes only when the album (or page) changes.
 */
const IMAGE_SUFFIX_RE = /\/image\/\d+\/?$/;

export function getViewKey(pathname: string): string {
  const withoutImage = pathname.replace(IMAGE_SUFFIX_RE, '');
  return withoutImage === '' ? '/' : withoutImage.replace(/\/+$/, '') || '/';
}
