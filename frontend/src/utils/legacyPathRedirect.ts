/**
 * Old lanbilder.se links are path URLs (`/dreamhack/dreamhack_97/martin_ojes/`), but the app runs
 * under HashRouter (`/#/dreamhack/...`). When the server falls back to index.html for such a path,
 * the router would read the empty hash and show the home page (LOGIC-32). This maps the path into
 * the hash before the router mounts; PathResolverPage then resolves it like any path URL.
 * Works on any static host (no server rewrite needed beyond the index.html fallback).
 */
export function legacyPathToHash(loc: { pathname: string; search: string; hash: string }): string | null {
  if (loc.hash.startsWith('#/')) return null; // already an app URL
  // the old static tree linked folders, sometimes with an explicit index.html
  const pathname = loc.pathname.replace(/\/index\.html?$/i, '/');
  if (pathname === '/' || pathname === '') return null;
  return `/#${pathname}${loc.search}`;
}
