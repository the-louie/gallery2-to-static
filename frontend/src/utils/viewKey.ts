/**
 * View identity for cache clearing and fetch aborting (PERF-03).
 *
 * Stepping through the photos of an album changes the URL on every photo (`/x/y/photo_a` →
 * `/x/y/photo_b`, or the id forms `/album/7/image/12` → `/album/7/image/13`), but it is the same
 * album view: the neighbour images preloaded for the viewer must survive the step. Album URLs end
 * with `/` (URL-01), photo URLs do not, so the view key is the album part of the pathname.
 */
const IMAGE_SUFFIX_RE = /\/image\/\d+\/?$/;
const ID_ROUTE_RE = /^\/(album|image)\//;

export function getViewKey(pathname: string): string {
  let p = pathname.replace(IMAGE_SUFFIX_RE, '');
  // A photo slug: the last segment of a path-based URL without a trailing slash, below an album
  if (p === pathname && !ID_ROUTE_RE.test(p) && !p.endsWith('/')) {
    const cut = p.lastIndexOf('/');
    if (cut > 0) p = p.slice(0, cut);
  }
  return p === '' ? '/' : p.replace(/\/+$/, '') || '/';
}
