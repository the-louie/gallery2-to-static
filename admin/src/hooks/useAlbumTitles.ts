import { useEffect, useState } from "react";
import { api } from "../api";

const titleCache = new Map<number, string>();

/**
 * Titles for album ids (delegations are ids only), fetched once each through
 * `GET /api/albums/:id`; `#id` until known or when the album cannot be read.
 */
export function useAlbumTitles(ids: number[]): Map<number, string> {
  const key = ids.join(",");
  const [, bump] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const missing = ids.filter((id) => !titleCache.has(id));
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (id) => {
        try {
          const v = await api.album(id);
          titleCache.set(id, v.album?.title ?? `#${id}`);
        } catch {
          titleCache.set(id, `#${id}`);
        }
      })
    ).then(() => {
      if (!cancelled) bump((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const out = new Map<number, string>();
  for (const id of ids) out.set(id, titleCache.get(id) ?? `#${id}`);
  return out;
}

/** Test hook: forget cached titles. */
export function clearAlbumTitleCache(): void {
  titleCache.clear();
}
