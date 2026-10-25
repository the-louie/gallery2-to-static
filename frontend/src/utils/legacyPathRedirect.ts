/**
 * The app uses clean path URLs (`/dreamhack/dhw05/`, URL-01). Two older URL forms are moved to
 * them before the router reads the location:
 * - hash URLs from the HashRouter era (`/#/dreamhack/dhw05`), used on the test host;
 * - the old static tree's explicit `index.html` (`/dreamhack/index.html`, LOGIC-32).
 * Returns the URL to replace the current one with, or null when it is already clean.
 */
export function legacyUrlToCleanPath(loc: { pathname: string; search: string; hash: string }): string | null {
  if (loc.hash.startsWith('#/')) return loc.hash.slice(1);
  if (/\/index\.html?$/i.test(loc.pathname)) {
    return `${loc.pathname.replace(/\/index\.html?$/i, '/')}${loc.search}`;
  }
  return null;
}
