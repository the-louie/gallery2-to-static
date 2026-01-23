/**
 * Search index loader utility
 *
 * Provides functionality to load pre-built search index files from the data/search/ directory.
 * The search index is generated during extraction time and loaded at runtime.
 *
 * ## Usage
 *
 * ```typescript
 * import { loadSearchIndex } from './utils/searchIndexLoader';
 *
 * const indexData = await loadSearchIndex();
 * if (indexData) {
 *   const items = indexData.items;
 * }
 * ```
 */

import type { SearchIndexItem } from './searchIndex';

/**
 * Search index file structure
 */
export interface SearchIndexFile {
  /** Version of the index format */
  version: number;
  /** ISO timestamp when index was generated */
  generatedAt: string;
  /** Total number of items in index */
  itemCount: number;
  /** Array of search index items */
  items: SearchIndexItem[];
}

/**
 * In-memory cache for search index
 * Key: URL string, Value: SearchIndexFile
 */
const cache = new Map<string, SearchIndexFile | null>();

/**
 * Get cached search index
 *
 * @param url - The URL to check in cache
 * @returns Cached index data or null if not found
 */
export function getCachedSearchIndex(url: string): SearchIndexFile | null | undefined {
  return cache.get(url);
}

/**
 * Set cached search index
 *
 * @param url - The URL to cache
 * @param data - The index data to cache
 */
export function setCachedSearchIndex(url: string, data: SearchIndexFile | null): void {
  cache.set(url, data);
}

/**
 * Clear all cached search index data
 * Useful for testing
 */
export function clearSearchIndexCache(): void {
  cache.clear();
}

/**
 * Load search index from data/search/index.json
 *
 * Loads the pre-built search index file generated during extraction.
 * The index contains all searchable albums and images.
 *
 * @returns Promise resolving to SearchIndexFile or null if index not found
 * @throws {Error} When network request fails or JSON parsing fails
 *
 * @example
 * ```typescript
 * try {
 *   const indexData = await loadSearchIndex();
 *   if (indexData) {
 *     console.log(`Loaded ${indexData.itemCount} searchable items`);
 *   }
 * } catch (error) {
 *   console.error('Failed to load search index:', error);
 * }
 * ```
 */
export async function loadSearchIndex(): Promise<SearchIndexFile | null> {
  const url = '/data/search/index.json';

  // Check cache first
  const cached = getCachedSearchIndex(url);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        // Index file not found - return null (not an error, just missing)
        setCachedSearchIndex(url, null);
        return null;
      }
      throw new Error(
        `Failed to load search index: ${response.status} ${response.statusText}`,
      );
    }

    let jsonData: unknown;
    try {
      jsonData = await response.json();
    } catch (error) {
      throw new Error(
        `Failed to parse search index JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Basic validation
    if (
      typeof jsonData !== 'object' ||
      jsonData === null ||
      !('version' in jsonData) ||
      !('items' in jsonData) ||
      !Array.isArray((jsonData as { items: unknown }).items)
    ) {
      throw new Error('Invalid search index file structure');
    }

    const indexData = jsonData as SearchIndexFile;

    // Store in cache
    setCachedSearchIndex(url, indexData);

    return indexData;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error loading search index: ${error.message}`,
      );
    }

    // Re-throw known errors
    if (error instanceof Error) {
      throw error;
    }

    // Unknown error, wrap it
    throw new Error(
      `Unexpected error loading search index: ${String(error)}`,
    );
  }
}
