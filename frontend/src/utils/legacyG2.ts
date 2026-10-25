/**
 * Old Gallery 2 URLs → the app's clean URLs (URL-02). lanbilder.se ran Gallery 2.0 with short URLs:
 * - album:  /v/dreamhack/dhw05/dhphotos/            (Gallery 2 path components, with ?g2_page=N)
 * - photo:  /v/dreamhack/dhw05/dhphotos/CIMG0053_.JPG.html
 * - by id:  /main.php?g2_view=core.ShowItem&g2_itemId=57207   (any g2_view; g2_itemId decides)
 * Session ids (g2_GALLERYSID) and g2_highlightId are ignored. Image files (/d/…) are not redirected:
 * the web server answers them with 402.
 *
 * The data comes from data/legacy.json (backend/extract.ts: Gallery 2 album path → new path, photo
 * id → album id), fetched only when such a URL is opened.
 */
import { getPhotoSlug, withTrailingSlash } from '@/utils/albumPath';
import { loadAlbum, loadPathIndex } from '@/utils/dataLoader';
import { pageHref, parsePage } from '@/utils/matrixPaging';

export interface LegacyData {
  albums: Record<string, string>;
  photoAlbum: Record<string, number>;
}

export type LegacyUrl =
  | { kind: 'album'; g2Path: string; page: number }
  | { kind: 'photo'; g2Path: string; file: string }
  | { kind: 'item'; id: number; page: number };

/** The old URL's meaning, or null when it is not an old Gallery 2 URL. */
export function parseLegacyUrl(pathname: string, search: string): LegacyUrl | null {
  const params = new URLSearchParams(search);
  const page = parsePage(params.get('g2_page'));
  if (/^\/main\.php$/i.test(pathname)) {
    const raw = params.get('g2_itemId');
    if (raw === null) return { kind: 'album', g2Path: '', page };
    return /^\d{1,12}$/.test(raw) ? { kind: 'item', id: Number(raw), page } : null;
  }
  const m = pathname.match(/^\/v(\/.*)?$/i);
  if (!m) return null;
  let rest: string;
  try {
    rest = decodeURIComponent(m[1] ?? '/');
  } catch {
    return null;
  }
  const segments = rest.split('/').filter((s) => s !== '');
  const last = segments[segments.length - 1];
  if (last !== undefined && /\.html?$/i.test(last) && !rest.endsWith('/')) {
    return { kind: 'photo', g2Path: segments.slice(0, -1).join('/'), file: last.replace(/\.html?$/i, '') };
  }
  return { kind: 'album', g2Path: segments.join('/'), page };
}

/** Case-insensitive lookup of a Gallery 2 album path (old links were typed in either case). */
function findAlbumPath(albums: Record<string, string>, g2Path: string): string | null {
  if (g2Path in albums) return albums[g2Path];
  const lower = g2Path.toLowerCase();
  for (const [key, value] of Object.entries(albums)) if (key.toLowerCase() === lower) return value;
  return null;
}

let legacyPromise: Promise<LegacyData> | null = null;

/** data/legacy.json, fetched once per page load (a failure is not kept, so a retry fetches again). */
export function loadLegacyData(): Promise<LegacyData> {
  if (!legacyPromise) {
    legacyPromise = fetch('/data/legacy.json')
      .then(async (r) => {
        if (!r.ok) throw new Error(`legacy.json: HTTP ${r.status}`);
        return (await r.json()) as LegacyData;
      })
      .catch((err: unknown) => {
        legacyPromise = null;
        throw err;
      });
  }
  return legacyPromise;
}

/**
 * The new URL for an old one, or null when nothing matches (the page then shows "not found").
 * Rejects only when the data cannot be loaded.
 */
export async function resolveLegacyUrl(url: LegacyUrl): Promise<string | null> {
  const legacy = await loadLegacyData();
  if (url.kind === 'album') {
    const albumPath = findAlbumPath(legacy.albums, url.g2Path);
    return albumPath === null ? null : pageHref(withTrailingSlash(albumPath), url.page);
  }
  if (url.kind === 'photo') {
    const albumPath = findAlbumPath(legacy.albums, url.g2Path);
    return albumPath === null ? null : `${withTrailingSlash(albumPath)}${getPhotoSlug({ id: 0, pathComponent: url.file })}`;
  }
  const pathIndex = await loadPathIndex();
  const albumPath = Object.keys(pathIndex).find((p) => pathIndex[p] === url.id);
  if (albumPath !== undefined) return pageHref(withTrailingSlash(albumPath), url.page);
  const albumId = legacy.photoAlbum[String(url.id)];
  if (albumId === undefined) return null;
  const album = await loadAlbum(albumId);
  const photo = album.children.find((c) => c.id === url.id && c.type !== 'GalleryAlbumItem');
  const trail = album.metadata.breadcrumbPath ?? [];
  const parentPath = trail.length > 0 ? trail[trail.length - 1].path : undefined;
  if (!photo || parentPath === undefined) return null;
  return `${withTrailingSlash(parentPath)}${getPhotoSlug(photo)}`;
}

/** For tests: forget the fetched data. */
export function resetLegacyDataForTests(): void {
  legacyPromise = null;
}
