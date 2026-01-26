/**
 * Data loading utilities for JSON album data
 *
 * Provides functions to load album JSON files from the /data/ directory
 * with error handling, caching, and root album discovery.
 *
 * ## Usage
 *
 * ```typescript
 * import { loadAlbum, findRootAlbumId } from './utils/dataLoader';
 *
 * // Load a specific album
 * const { metadata, children } = await loadAlbum(7);
 *
 * // Find root album ID
 * const rootId = await findRootAlbumId();
 * ```
 *
 * ## Error Handling
 *
 * The module provides custom error classes for different failure scenarios:
 * - `NotFoundError`: Album file not found (404)
 * - `NetworkError`: Network request failed
 * - `ParseError`: JSON parsing or validation failed
 * - `DataLoadError`: Base error class for all data loading errors
 *
 * ## Caching
 *
 * Data is cached in memory after first load. The cache persists for the
 * application lifetime and prevents unnecessary network requests.
 *
 * Cache functions are exported for testing purposes:
 * - `getCachedData(url)`: Get cached data
 * - `setCachedData(url, data)`: Set cached data
 * - `clearCache()`: Clear all cached data
 *
 * Album JSON files use the structure `{ metadata: AlbumMetadata, children: Child[] }`.
 */

import type { Child, AlbumFile } from '../../../backend/types';
import type { IndexMetadata } from '../types';

/**
 * Base error class for data loading errors
 */
export class DataLoadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DataLoadError';
    Object.setPrototypeOf(this, DataLoadError.prototype);
  }
}

/**
 * Error thrown when network request fails
 */
export class NetworkError extends DataLoadError {
  constructor(message: string, cause?: unknown) {
    super(message, 'NETWORK_ERROR', cause);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Error thrown when JSON parsing fails
 */
export class ParseError extends DataLoadError {
  constructor(message: string, cause?: unknown) {
    super(message, 'PARSE_ERROR', cause);
    this.name = 'ParseError';
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}

/**
 * Error thrown when album JSON file is not found (404)
 */
export class NotFoundError extends DataLoadError {
  constructor(message: string, cause?: unknown) {
    super(message, 'NOT_FOUND', cause);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * In-memory cache for album data
 * Key: URL string, Value: AlbumFile
 *
 * Cache Strategy:
 * - No size limit: Static JSON files are typically small and limited in number
 * - No expiration: Data doesn't change during application lifetime
 * - Cache persists for application lifetime
 * - Cache is unbounded; optional LRU or size-based eviction can be added later
 *   if the user visits many albums and memory becomes an issue.
 */
const cache = new Map<string, AlbumFile>();

/**
 * Get cached data for a URL
 *
 * @param url - The URL to check in cache
 * @returns Cached AlbumFile or null if not found
 */
export function getCachedData(url: string): AlbumFile | null {
  return cache.get(url) ?? null;
}

/**
 * Set cached data for a URL
 *
 * @param url - The URL to cache
 * @param data - The AlbumFile to cache
 */
export function setCachedData(url: string, data: AlbumFile): void {
  cache.set(url, data);
}

/**
 * Clear all cached data
 * Useful for testing
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Validate that data matches Child[] structure.
 * Used for the children array inside AlbumFile.
 *
 * @param data - Data to validate
 * @returns True if data appears to be valid Child[]
 */
function validateChildArray(data: unknown): data is Child[] {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.every((item) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('id' in item) ||
      !('type' in item) ||
      !('hasChildren' in item) ||
      !('title' in item) ||
      !('description' in item) ||
      !('pathComponent' in item) ||
      !('timestamp' in item) ||
      !('width' in item) ||
      !('height' in item) ||
      !('thumb_width' in item) ||
      !('thumb_height' in item)
    ) {
      return false;
    }

    // Validate field types (title, description, pathComponent nullable per Child / backend)
    const child = item as Record<string, unknown>;
    const ownerNameOk =
      !('ownerName' in child) ||
      child.ownerName === null ||
      typeof child.ownerName === 'string';
    const summaryOk =
      !('summary' in child) ||
      child.summary === null ||
      typeof child.summary === 'string';
    const urlPathOk =
      !('urlPath' in child) ||
      child.urlPath === null ||
      typeof child.urlPath === 'string';
    const thumbnailUrlPathOk =
      !('thumbnailUrlPath' in child) ||
      child.thumbnailUrlPath === null ||
      typeof child.thumbnailUrlPath === 'string';
    const highlightThumbnailUrlPathOk =
      !('highlightThumbnailUrlPath' in child) ||
      child.highlightThumbnailUrlPath === null ||
      typeof child.highlightThumbnailUrlPath === 'string';
    return (
      typeof child.id === 'number' &&
      typeof child.type === 'string' &&
      typeof child.hasChildren === 'boolean' &&
      (child.title === null || typeof child.title === 'string') &&
      (child.description === null || typeof child.description === 'string') &&
      (child.pathComponent === null || typeof child.pathComponent === 'string') &&
      (child.timestamp === null || typeof child.timestamp === 'number') &&
      (child.width === null || typeof child.width === 'number') &&
      (child.height === null || typeof child.height === 'number') &&
      (child.thumb_width === null || typeof child.thumb_width === 'number') &&
      (child.thumb_height === null || typeof child.thumb_height === 'number') &&
      ownerNameOk &&
      summaryOk &&
      urlPathOk &&
      thumbnailUrlPathOk &&
      highlightThumbnailUrlPathOk
    );
  });
}

/**
 * Validate that data matches AlbumFile structure ({ metadata, children }).
 *
 * @param data - Data to validate
 * @returns True if data appears to be valid AlbumFile
 */
function validateAlbumFile(data: unknown): data is AlbumFile {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (!('metadata' in obj) || !('children' in obj)) {
    return false;
  }
  const meta = obj.metadata;
  if (typeof meta !== 'object' || meta === null) {
    return false;
  }
  const m = meta as Record<string, unknown>;
  if (
    typeof m.albumId !== 'number' ||
    (m.albumTitle !== null && typeof m.albumTitle !== 'string') ||
    (m.albumDescription !== null && typeof m.albumDescription !== 'string') ||
    (m.albumTimestamp !== null && typeof m.albumTimestamp !== 'number') ||
    (m.ownerName !== null && typeof m.ownerName !== 'string')
  ) {
    return false;
  }
  if (!validateChildArray(obj.children)) {
    return false;
  }
  return true;
}

/**
 * Load album JSON data by ID
 *
 * Loads JSON from `/data/{id}.json` with caching. Validates structure
 * matches { metadata: AlbumMetadata, children: Child[] }.
 *
 * @param id - Album ID to load
 * @returns Promise resolving to AlbumFile
 * @throws {NotFoundError} When album file is not found (404)
 * @throws {NetworkError} When network request fails (offline, timeout, etc.)
 * @throws {ParseError} When JSON parsing fails or data structure is invalid
 *
 * @example
 * ```typescript
 * try {
 *   const { metadata, children } = await loadAlbum(7);
 *   console.log(`Loaded ${children.length} items`);
 * } catch (error) {
 *   if (error instanceof NotFoundError) {
 *     console.error('Album not found');
 *   } else if (error instanceof NetworkError) {
 *     console.error('Network error:', error.message);
 *   }
 * }
 * ```
 */
export async function loadAlbum(id: number): Promise<AlbumFile> {
  const url = `/data/${id}.json`;

  const cached = getCachedData(url);
  if (cached !== null) {
    return cached;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError(
          `Album ${id} not found (${url})`,
          new Error(`HTTP ${response.status}: ${response.statusText}`),
        );
      }
      throw new NetworkError(
        `Failed to load album ${id}: ${response.status} ${response.statusText}`,
        new Error(`HTTP ${response.status}: ${response.statusText}`),
      );
    }

    let jsonData: unknown;
    try {
      jsonData = await response.json();
    } catch (error) {
      throw new ParseError(
        `Failed to parse JSON for album ${id}`,
        error,
      );
    }

    if (!validateAlbumFile(jsonData)) {
      throw new ParseError(
        `Invalid data structure for album ${id}: expected { metadata, children }`,
      );
    }

    const file = jsonData as AlbumFile;
    setCachedData(url, file);
    return file;
  } catch (error) {
    // Re-throw known errors
    if (
      error instanceof NotFoundError ||
      error instanceof NetworkError ||
      error instanceof ParseError
    ) {
      throw error;
    }

    // Handle network errors (offline, timeout, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError(
        `Network error loading album ${id}: ${error.message}`,
        error,
      );
    }

    // Unknown error, wrap it
    throw new DataLoadError(
      `Unexpected error loading album ${id}`,
      'UNKNOWN_ERROR',
      error,
    );
  }
}

/**
 * Load index.json metadata
 *
 * Loads the index.json file which contains root album information and site metadata.
 * This is the preferred method to discover the root album.
 *
 * @returns Promise resolving to IndexMetadata or null if index.json not found
 * @throws {NetworkError} When network request fails
 * @throws {ParseError} When JSON parsing fails
 *
 * @example
 * ```typescript
 * const index = await loadIndex();
 * if (index !== null) {
 *   const rootId = index.rootAlbumId;
 *   const siteName = index.siteName;
 * }
 * ```
 */
export async function loadIndex(): Promise<IndexMetadata | null> {
  const url = '/data/index.json';

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new NetworkError(
        `Failed to load index.json: ${response.status} ${response.statusText}`,
        new Error(`HTTP ${response.status}: ${response.statusText}`),
      );
    }

    let jsonData: unknown;
    try {
      jsonData = await response.json();
    } catch (error) {
      throw new ParseError('Failed to parse index.json', error);
    }

    // Basic validation
    if (
      typeof jsonData !== 'object' ||
      jsonData === null ||
      !('rootAlbumId' in jsonData) ||
      !('rootAlbumFile' in jsonData)
    ) {
      throw new ParseError('Invalid index.json structure');
    }

    return jsonData as IndexMetadata;
  } catch (error) {
    // Re-throw known errors
    if (error instanceof NetworkError || error instanceof ParseError) {
      throw error;
    }

    // Handle network errors (offline, timeout, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError(
        `Network error loading index.json: ${error.message}`,
        error,
      );
    }

    // Unknown error, wrap it
    throw new DataLoadError(
      'Unexpected error loading index.json',
      'UNKNOWN_ERROR',
      error,
    );
  }
}

/**
 * Find root album ID
 *
 * Discovers the root album ID by first checking index.json (preferred method).
 * If index.json doesn't exist, falls back to checking common locations:
 * - First checks for 7.json (hardcoded root from backend)
 * - If not found, tries common root IDs (1, 0) in order
 *
 * Returns null if no valid root album is found.
 *
 * @returns Promise resolving to root album ID or null if not found
 *
 * @example
 * ```typescript
 * const rootId = await findRootAlbumId();
 * if (rootId !== null) {
 *   const { children } = await loadAlbum(rootId);
 * }
 * ```
 */
export async function findRootAlbumId(): Promise<number | null> {
  // First try loading index.json (preferred method)
  try {
    const index = await loadIndex();
    if (index !== null) {
      return index.rootAlbumId;
    }
  } catch (error) {
    // If index.json doesn't exist (404), fall back to discovery
    // If it's a different error (network, parse), log but continue with fallback
    if (!(error instanceof NotFoundError)) {
      console.warn('Error loading index.json, falling back to discovery:', error);
    }
  }

  // Fallback: Try hardcoded root (7)
  try {
    await loadAlbum(7);
    return 7;
  } catch (error) {
    // If 7.json doesn't exist, try discovery
    if (error instanceof NotFoundError) {
      // Try common root IDs (excluding 7 since we already tried it)
      const commonRoots = [1, 0];
      for (const rootId of commonRoots) {
        try {
          await loadAlbum(rootId);
          return rootId;
        } catch (err) {
          // Continue to next ID
          if (!(err instanceof NotFoundError)) {
            // If it's a different error (network, parse), log but continue
            console.warn(
              `Error checking root album ${rootId}:`,
              err,
            );
          }
        }
      }
    } else {
      // If it's a different error (network, parse), log it
      console.warn('Error checking root album 7:', error);
    }
  }

  return null;
}
