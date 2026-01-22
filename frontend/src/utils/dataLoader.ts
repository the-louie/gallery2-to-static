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
 * const children = await loadAlbum(7);
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
 */

import type { Child } from '../../../backend/types';
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
 * Key: URL string, Value: Child[] array
 *
 * Cache Strategy:
 * - No size limit: Static JSON files are typically small and limited in number
 * - No expiration: Data doesn't change during application lifetime
 * - Cache persists for application lifetime
 * - If memory becomes an issue, consider implementing LRU eviction or size limits
 */
const cache = new Map<string, Child[]>();

/**
 * Get cached data for a URL
 *
 * @param url - The URL to check in cache
 * @returns Cached data or null if not found
 */
export function getCachedData(url: string): Child[] | null {
  return cache.get(url) ?? null;
}

/**
 * Set cached data for a URL
 *
 * @param url - The URL to cache
 * @param data - The data to cache
 */
export function setCachedData(url: string, data: Child[]): void {
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
 * Validate that data matches Child[] structure
 * Basic runtime validation to catch type mismatches
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

    // Validate field types
    const child = item as Record<string, unknown>;
    return (
      typeof child.id === 'number' &&
      typeof child.type === 'string' &&
      typeof child.hasChildren === 'boolean' &&
      typeof child.title === 'string' &&
      typeof child.description === 'string' &&
      typeof child.pathComponent === 'string' &&
      typeof child.timestamp === 'number' &&
      (child.width === null || typeof child.width === 'number') &&
      (child.height === null || typeof child.height === 'number') &&
      (child.thumb_width === null || typeof child.thumb_width === 'number') &&
      (child.thumb_height === null || typeof child.thumb_height === 'number')
    );
  });
}

/**
 * Load album JSON data by ID
 *
 * Loads JSON data from `/data/{id}.json` with caching support.
 * Checks cache first, then fetches from network if not cached.
 * Validates data structure matches Child[] type.
 *
 * @param id - Album ID to load
 * @returns Promise resolving to array of Child items
 * @throws {NotFoundError} When album file is not found (404)
 * @throws {NetworkError} When network request fails (offline, timeout, etc.)
 * @throws {ParseError} When JSON parsing fails or data structure is invalid
 *
 * @example
 * ```typescript
 * try {
 *   const children = await loadAlbum(7);
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
export async function loadAlbum(id: number): Promise<Child[]> {
  const url = `/data/${id}.json`;

  // Check cache first
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

    // Validate data structure
    if (!validateChildArray(jsonData)) {
      throw new ParseError(
        `Invalid data structure for album ${id}: expected Child[] array`,
      );
    }

    // Store in cache
    setCachedData(url, jsonData);

    return jsonData;
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
 *   const children = await loadAlbum(rootId);
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
