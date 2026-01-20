/**
 * Album metadata utility functions
 *
 * Provides utilities for retrieving album metadata from parent album data.
 * Since the JSON data structure contains only children of an album (not the album itself),
 * we need to look up album metadata from the parent album's children array.
 *
 * @module frontend/src/utils/albumMetadata
 */

import type { Child } from '../../../types';
import type { Album } from '@/types';
import { isAlbum } from '@/types';

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
 * const parentChildren = await loadAlbum(parentId);
 * const albumMetadata = getAlbumMetadata(albumId, parentChildren);
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
