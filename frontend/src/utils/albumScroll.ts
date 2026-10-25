/**
 * Album scroll position across a lightbox visit (LOGIC-17).
 *
 * The album page is unmounted while an image is open, so its window scroll position is lost. The
 * album remembers it when an image is opened; after the lightbox is closed (history Back), the
 * album restores it once its data is shown. sessionStorage, so it survives the remount but not
 * the tab; every access is guarded (private mode, storage disabled).
 */
const KEY_PREFIX = 'album-scroll:';

/** Location state set when the lightbox is opened from an album grid. */
export interface LightboxFromAlbumState {
  fromAlbum: true;
}

export function isFromAlbumState(state: unknown): state is LightboxFromAlbumState {
  return typeof state === 'object' && state !== null && (state as { fromAlbum?: unknown }).fromAlbum === true;
}

export function rememberAlbumScroll(albumPath: string, scrollY: number): void {
  try {
    sessionStorage.setItem(KEY_PREFIX + albumPath, String(Math.max(0, Math.round(scrollY))));
  } catch {
    // storage unavailable: nothing to restore later
  }
}

/** Returns and forgets the remembered position for albumPath, or null. */
export function takeAlbumScroll(albumPath: string): number | null {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + albumPath);
    if (raw === null) return null;
    sessionStorage.removeItem(KEY_PREFIX + albumPath);
    const y = Number(raw);
    return Number.isFinite(y) && y >= 0 ? y : null;
  } catch {
    return null;
  }
}
