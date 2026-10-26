/**
 * View counter beacon (Sprint 15 T-09, FUT-01 decision "counters keep counting"): one
 * `POST /api/view/<id>` per album or photo view, sent with `navigator.sendBeacon` (no cookies, no
 * response read), once per item per page session. The admin service adds it to `view_counts`;
 * the nightly run folds the counts into the pages.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useMatrixLocation } from './useMatrixLocation';

const sent = new Set<string>();

/** Sends the beacon for `id` once per page session; exported for tests. */
export function sendViewBeacon(id: number, key: string = `v:${id}`): boolean {
  if (sent.has(key)) return false;
  sent.add(key);
  const url = `/api/view/${id}`;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url);
    } else if (typeof fetch === 'function') {
      void fetch(url, { method: 'POST', keepalive: true, credentials: 'omit' }).catch(() => {});
    }
  } catch {
    // counting is best effort
  }
  return true;
}

/** Test hook: forget what was sent. */
export function resetViewBeaconsForTests(): void {
  sent.clear();
}

/** Counts a view of the album or photo the current URL shows (both themes; the Layout calls it). */
export function useViewBeacon(): void {
  const { pathname } = useLocation();
  const { location } = useMatrixLocation(pathname);
  const id = location?.photo?.id ?? location?.album.metadata.albumId ?? null;
  useEffect(() => {
    if (id !== null) sendViewBeacon(id);
  }, [id]);
}
