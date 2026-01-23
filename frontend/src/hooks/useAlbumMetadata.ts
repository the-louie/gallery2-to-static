/**
 * Hook to load album metadata (title, description, etc.)
 *
 * Loads the album metadata by finding it in the parent album's children array.
 * This is needed because JSON files only contain children, not the album itself.
 *
 * @param albumId - The album ID to load metadata for
 * @param albumProp - Optional album metadata if already available
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
import { loadAlbum } from '@/utils/dataLoader';
import { getParentAlbumId } from '@/utils/breadcrumbPath';
import { getAlbumMetadata } from '@/utils/albumMetadata';
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

    // Load album metadata by finding parent and looking in parent's children
    async function loadMetadata() {
      try {
        const parentId = await getParentAlbumId(albumId);
        if (parentId === null) {
          // No parent found (orphaned or root)
          setAlbum(null);
          return;
        }

        const parentChildren = await loadAlbum(parentId);
        const albumMetadata = getAlbumMetadata(albumId, parentChildren);

        if (isMountedRef.current) {
          setAlbum(albumMetadata);
        }
      } catch (error) {
        // If we can't load metadata, just leave it as null
        // The component can still work without it
        if (isMountedRef.current) {
          setAlbum(null);
        }
      }
    }

    loadMetadata();

    return () => {
      isMountedRef.current = false;
    };
  }, [albumId, albumProp, rootAlbumId]);

  return album;
}
