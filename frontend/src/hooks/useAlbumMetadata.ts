/**
 * Hook to load album metadata (title, description, etc.)
 *
 * Uses albumProp when provided (e.g. from album file metadata). When albumProp
 * is not provided, returns null (metadata should always be available from album file).
 *
 * @param albumId - The album ID to load metadata for
 * @param albumProp - Optional album metadata if already available (e.g. from loadAlbum)
 * @param rootAlbumId - The root album ID (to skip loading for root)
 * @returns Album metadata or null
 *
 * @example
 * ```tsx
 * const album = useAlbumMetadata(albumId, albumProp, rootAlbumId);
 * if (album) {
 *   console.log(album.title);
 * }
 * ```
 */

import { useState, useEffect, useRef } from 'react';
import type { Album } from '@/types';

export function useAlbumMetadata(
  albumId: number,
  albumProp: Album | null | undefined,
  rootAlbumId: number | null,
): Album | null {
  const [album, setAlbum] = useState<Album | null>(albumProp || null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // If album prop is provided, use it
    if (albumProp) {
      setAlbum(albumProp);
      return;
    }

    // If this is the root album, we don't need metadata (won't show h2)
    if (rootAlbumId !== null && albumId === rootAlbumId) {
      setAlbum(null);
      return;
    }

    // If rootAlbumId is not loaded yet, wait
    if (rootAlbumId === null) {
      return;
    }

    // No albumProp and not root - return null (metadata should come from album file)
    if (isMountedRef.current) {
      setAlbum(null);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [albumId, albumProp, rootAlbumId]);

  return album;
}
