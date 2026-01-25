/**
 * Album metadata utility functions
 *
 * getAlbumMetadata finds an album in a parent's children array.
 * albumFromMetadata builds an Album from AlbumMetadata (e.g. from a loaded album file).
 *
 * @module frontend/src/utils/albumMetadata
 */

import type { Child, AlbumMetadata } from '../../../backend/types';
import type { Album } from '@/types';
import { isAlbum } from '@/types';

/**
 * Build an Album from AlbumMetadata (e.g. from loaded album file).
 * Used when displaying the current album and metadata comes from its JSON file.
 */
export function albumFromMetadata(m: AlbumMetadata): Album {
  return {
    id: m.albumId,
    type: 'GalleryAlbumItem',
    hasChildren: true,
    title: m.albumTitle,
    description: m.albumDescription,
    pathComponent: null,
    timestamp: m.albumTimestamp,
    width: null,
    height: null,
    thumb_width: null,
    thumb_height: null,
    ownerName: m.ownerName,
    summary: null,
    totalDescendantImageCount: m.totalDescendantImageCount ?? undefined,
  } as Album;
}

/**
 * Get album metadata from parent album's children array
 *
 * Finds an album in the parent's children array by ID and returns it as an Album.
 * This is useful when you have the album ID but need the album's metadata (title, description).
 *
 * @param albumId - The ID of the album to find
 * @param parentData - The children array from the parent album's JSON data
 * @returns The Album object if found, null otherwise
 *
 * @example
 * ```typescript
 * const { children } = await loadAlbum(parentId);
 * const albumMetadata = getAlbumMetadata(albumId, children);
 * if (albumMetadata) {
 *   console.log(albumMetadata.title);
 * }
 * ```
 */
export function getAlbumMetadata(
  albumId: number,
  parentData: Child[],
): Album | null {
  if (!Array.isArray(parentData)) {
    return null;
  }

  const found = parentData.find(
    (child) => child.id === albumId && isAlbum(child),
  );

  return found && isAlbum(found) ? found : null;
}
