/**
 * Breadcrumb path building utilities
 *
 * Provides functions to build breadcrumb navigation paths by traversing
 * up the album hierarchy. Since the JSON data structure only contains
 * children (not parent references), we must search upward to find parents.
 *
 * @module frontend/src/utils/breadcrumbPath
 */

import { loadAlbum, findRootAlbumId, DataLoadError } from './dataLoader';
import { getAlbumMetadata } from './albumMetadata';
import { decodeHtmlEntities } from './decodeHtmlEntities';
import type { BreadcrumbItem, BreadcrumbPath } from '@/types';

/**
 * Cache for root album ID to avoid repeated discovery
 */
let cachedRootAlbumId: number | null = null;

/**
 * Cache for parent lookups to avoid repeated searches
 * Key: child album ID, Value: parent album ID or null if not found
 */
const parentCache = new Map<number, number | null>();

/**
 * Get or discover root album ID
 *
 * Uses cached value if available, otherwise discovers root album.
 *
 * @returns Promise resolving to root album ID or null if not found
 */
async function getRootAlbumId(): Promise<number | null> {
  if (cachedRootAlbumId !== null) {
    return cachedRootAlbumId;
  }

  const rootId = await findRootAlbumId();
  if (rootId !== null) {
    cachedRootAlbumId = rootId;
  }
  return rootId;
}

/**
 * Find parent album ID for a given child album
 *
 * Searches for the parent album by checking if the child album
 * exists in potential parent albums' children arrays. Uses caching
 * to avoid repeated searches.
 *
 * Strategy:
 * 1. Check cache first
 * 2. Try common parent IDs (currentId - 1, currentId - 10, etc.)
 * 3. If not found, search more broadly (try IDs less than current)
 * 4. Cache result for future lookups
 *
 * @param childAlbumId - The child album ID to find parent for
 * @param rootAlbumId - The root album ID (to know when to stop)
 * @returns Promise resolving to parent album ID or null if not found
 */
async function findParentAlbumId(
  childAlbumId: number,
  rootAlbumId: number,
): Promise<number | null> {
  // Check cache first
  if (parentCache.has(childAlbumId)) {
    return parentCache.get(childAlbumId) ?? null;
  }

  // If this is the root album, it has no parent
  if (childAlbumId === rootAlbumId) {
    return null;
  }

  // Try common parent IDs (sequential IDs are likely)
  const candidatesToTry: number[] = [];

  // Try IDs just before the current one (most common case)
  for (let i = 1; i <= 20; i++) {
    const candidateId = childAlbumId - i;
    if (candidateId > 0 && candidateId !== childAlbumId) {
      candidatesToTry.push(candidateId);
    }
  }

  // Try a broader range if needed (but limit to avoid too many requests)
  // We'll search IDs less than current, but cap at 100 candidates
  if (candidatesToTry.length < 50) {
    for (let i = childAlbumId - 100; i < childAlbumId && i > 0; i += 5) {
      if (!candidatesToTry.includes(i)) {
        candidatesToTry.push(i);
      }
    }
  }

  // Try each candidate
  for (const candidateId of candidatesToTry) {
    try {
      const file = await loadAlbum(candidateId);
      const childAlbum = getAlbumMetadata(childAlbumId, file.children);

      if (childAlbum !== null) {
        // Found parent!
        parentCache.set(childAlbumId, candidateId);
        return candidateId;
      }
    } catch (error) {
      // Album doesn't exist or error loading, continue to next candidate
      if (error instanceof DataLoadError && error.code === 'NOT_FOUND') {
        continue;
      }
      // For other errors, log but continue
      console.warn(
        `Error checking parent candidate ${candidateId} for child ${childAlbumId}:`,
        error,
      );
    }
  }

  // Not found in candidates, return null
  // Cache null result to avoid repeated searches
  parentCache.set(childAlbumId, null);
  return null;
}

/**
 * Build breadcrumb path from album ID to root
 *
 * Traverses upward from the current album to the root, building
 * a breadcrumb path. Each item in the path includes the album ID,
 * title, and navigation path.
 *
 * @param albumId - The current album ID
 * @param rootAlbumId - The root album ID (optional, will be discovered if not provided)
 * @returns Promise resolving to breadcrumb path from root to current album
 *
 * @example
 * ```typescript
 * const path = await buildBreadcrumbPath(42, 7);
 * // Returns: [
 * //   { id: 7, title: "Root Album", path: "/" },
 * //   { id: 20, title: "Child Album", path: "/album/20" },
 * //   { id: 42, title: "Current Album", path: "/album/42" }
 * // ]
 * ```
 */
export async function buildBreadcrumbPath(
  albumId: number,
  rootAlbumId?: number,
): Promise<BreadcrumbPath> {
  // Discover root if not provided
  const rootId =
    rootAlbumId !== undefined ? rootAlbumId : await getRootAlbumId();

  if (rootId === null) {
    // Can't build path without root
    return [];
  }

  // If this is the root album, return just home
  if (albumId === rootId) {
    return [
      {
        id: rootId,
        title: decodeHtmlEntities('Home'),
        path: '/',
      },
    ];
  }

  // Build path by traversing upward
  const path: BreadcrumbItem[] = [];
  let currentAlbumId: number | null = albumId;
  const visited = new Set<number>(); // Prevent infinite loops

  while (currentAlbumId !== null && currentAlbumId !== rootId) {
    // Prevent infinite loops
    if (visited.has(currentAlbumId)) {
      console.warn(
        `Circular reference detected in album hierarchy at album ${currentAlbumId}`,
      );
      break;
    }
    visited.add(currentAlbumId);

    // Find parent
    const parentId = await findParentAlbumId(currentAlbumId, rootId);

    if (parentId === null) {
      // Orphaned album (no parent found)
      // Add current album to path and stop
      try {
        const rootFile = await loadAlbum(rootId);
        const albumMetadata = getAlbumMetadata(currentAlbumId, rootFile.children);

        if (albumMetadata) {
          path.unshift({
            id: currentAlbumId,
            title: decodeHtmlEntities(albumMetadata.title ?? `Album ${currentAlbumId}`),
            path: `/album/${currentAlbumId}`,
          });
        } else {
          path.unshift({
            id: currentAlbumId,
            title: decodeHtmlEntities(`Album ${currentAlbumId}`),
            path: `/album/${currentAlbumId}`,
          });
        }
      } catch {
        // If we can't load, use ID as title
        path.unshift({
          id: currentAlbumId,
          title: decodeHtmlEntities(`Album ${currentAlbumId}`),
          path: `/album/${currentAlbumId}`,
        });
      }
      break;
    }

    try {
      const parentFile = await loadAlbum(parentId);
      const albumMetadata = getAlbumMetadata(currentAlbumId, parentFile.children);

      if (albumMetadata) {
        path.unshift({
          id: currentAlbumId,
          title: decodeHtmlEntities(albumMetadata.title ?? `Album ${currentAlbumId}`),
          path: `/album/${currentAlbumId}`,
        });
      } else {
        path.unshift({
          id: currentAlbumId,
          title: decodeHtmlEntities(`Album ${currentAlbumId}`),
          path: `/album/${currentAlbumId}`,
        });
      }
    } catch (error) {
      // Error loading parent, use fallback
      console.warn(
        `Error loading parent ${parentId} for album ${currentAlbumId}:`,
        error,
      );
      path.unshift({
        id: currentAlbumId,
        title: decodeHtmlEntities(`Album ${currentAlbumId}`),
        path: `/album/${currentAlbumId}`,
      });
    }

    // Move to parent
    currentAlbumId = parentId;
  }

  // Add root album at the beginning
  // For root, we use "Home" as title and "/" as path
  path.unshift({
    id: rootId,
    title: decodeHtmlEntities('Home'),
    path: '/',
  });

  return path;
}

/**
 * Get parent album ID for a given album
 *
 * Wrapper function that handles root album detection internally.
 * Returns null if the album is the root album or if the parent cannot be found.
 *
 * @param albumId - The album ID to find the parent for
 * @returns Promise resolving to parent album ID, or null if root album or parent not found
 *
 * @example
 * ```typescript
 * const parentId = await getParentAlbumId(42);
 * if (parentId !== null) {
 *   navigate(`/album/${parentId}`);
 * } else {
 *   navigate('/'); // Root album or orphaned
 * }
 * ```
 */
export async function getParentAlbumId(
  albumId: number,
): Promise<number | null> {
  const rootId = await getRootAlbumId();
  if (rootId === null) {
    // Can't determine parent without root
    return null;
  }
  return findParentAlbumId(albumId, rootId);
}

/**
 * Clear breadcrumb path caches
 *
 * Useful for testing or when data changes.
 */
export function clearBreadcrumbCache(): void {
  cachedRootAlbumId = null;
  parentCache.clear();
}
