/**
 * React hook for loading subalbums for multiple albums in parallel.
 *
 * Used by RootAlbumListView to fetch immediate child albums for each root-level
 * album. Uses loadAlbum per ID; dataLoader cache avoids duplicate fetches.
 * Prefers partial results on partial failure (logs error, continues).
 *
 * @module frontend/src/hooks
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { loadAlbum, DataLoadError } from '@/utils/dataLoader';
import { isAlbum } from '@/types';
import type { Album } from '@/types';

export interface UseSubalbumsMapReturn {
  /** Map of album ID -> child albums (GalleryAlbumItem only). */
  subalbumsMap: Map<number, Album[]>;
  /** True while any load is in progress. */
  isLoading: boolean;
  /** First error encountered, if any; partial results still populated. */
  error: DataLoadError | null;
}

/**
 * Load subalbums for multiple album IDs in parallel.
 *
 * For each ID, fetches the album JSON and filters children to albums only.
 * Uses loadAlbum cache; safe to call with overlapping or duplicate IDs.
 * Skips loading when albumIds is empty. Resets and refetches when albumIds change.
 *
 * @param albumIds - Album IDs to load (e.g. root-level albums with hasChildren)
 * @returns subalbumsMap, isLoading, error
 */
export function useSubalbumsMap(albumIds: number[]): UseSubalbumsMapReturn {
  const [subalbumsMap, setSubalbumsMap] = useState<Map<number, Album[]>>(() => new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<DataLoadError | null>(null);
  const isMountedRef = useRef(true);

  const idsKey = useMemo(
    () => (albumIds.length ? [...albumIds].sort((a, b) => a - b).join(',') : ''),
    [albumIds],
  );

  const fetchAll = useCallback(async (ids: number[]) => {
    if (ids.length === 0) {
      setSubalbumsMap(new Map());
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const file = await loadAlbum(id);
          const albums = file.children.filter(isAlbum) as Album[];
          return { id, albums, err: null as DataLoadError | null };
        } catch (e) {
          const err =
            e instanceof DataLoadError
              ? e
              : new DataLoadError(`Failed to load subalbums for album ${id}`, 'UNKNOWN_ERROR', e);
          return { id, albums: [] as Album[], err };
        }
      }),
    );

    if (!isMountedRef.current) return;

    const nextMap = new Map<number, Album[]>();
    let firstError: DataLoadError | null = null;
    for (const { id, albums, err } of results) {
      nextMap.set(id, albums);
      if (err && !firstError) firstError = err;
    }
    if (firstError) {
      console.error('[useSubalbumsMap] Partial failure loading subalbums:', firstError.message, firstError);
    }
    setSubalbumsMap(nextMap);
    setError(firstError);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAll(albumIds);
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey triggers refetch; albumIds from closure
  }, [idsKey, fetchAll]);

  return { subalbumsMap, isLoading, error };
}
