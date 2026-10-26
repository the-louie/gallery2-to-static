import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api";
import type { AdminItem, AlbumView } from "../types";

export interface AlbumState {
  view: AlbumView | null;
  loading: boolean;
  error: string | null;
  /** Re-fetch the album (after a write). */
  reload: () => Promise<void>;
  /** Replace one child in place without a round trip. */
  replaceChild: (item: AdminItem) => void;
  /** Replace the album itself in place. */
  replaceAlbum: (item: AdminItem) => void;
}

/**
 * Loads `GET /api/albums/:id` ("root" for the entry point). A request counter
 * drops stale replies when the id changes quickly.
 */
export function useAlbum(id: number | "root"): AlbumState {
  const [view, setView] = useState<AlbumView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    try {
      const v = await api.album(id);
      if (current !== requestId.current) return;
      setView(v);
      setError(null);
    } catch (e) {
      if (current !== requestId.current) return;
      setView(null);
      setError(
        e instanceof ApiError && e.status === 404
          ? "Album not found."
          : e instanceof ApiError && e.status === 403
            ? "You have no access to this album."
            : e instanceof Error
              ? e.message
              : String(e)
      );
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const replaceChild = useCallback((item: AdminItem) => {
    setView((v) =>
      v
        ? {
            ...v,
            children: v.children.map((c) => (c.id === item.id ? item : c)),
          }
        : v
    );
  }, []);

  const replaceAlbum = useCallback((item: AdminItem) => {
    setView((v) => (v ? { ...v, album: item } : v));
  }, []);

  return { view, loading, error, reload, replaceChild, replaceAlbum };
}
