/**
 * Search index utility for albums
 *
 * Provides functionality to load a pre-built search index and perform searches
 * on titles and descriptions. The search index is generated during extraction
 * time and loaded at runtime.
 *
 * ## Usage
 *
 * ```typescript
 * import { SearchIndex } from './utils/searchIndex';
 * import { findRootAlbumId } from './utils/dataLoader';
 *
 * const index = new SearchIndex();
 * const rootId = await findRootAlbumId();
 * await index.buildIndex(rootId);
 * const results = index.search('vacation');
 * ```
 *
 * ## Index Loading
 *
 * The index is loaded from a pre-built file at `/data/search/index.json` that
 * was generated during extraction. Only albums are indexed (not individual photos)
 * to keep the file size manageable. Each album is indexed with its title and
 * description for searching.
 *
 * ## Search Algorithm
 *
 * - Case-insensitive substring matching in title and description
 * - Results sorted by relevance (title matches first, then description matches)
 * - Limited to 100 results to prevent performance issues
 */

import { loadSearchIndex } from './searchIndexLoader';

/**
 * Search index item representing an album in the search index
 * Note: Only albums are indexed, not individual photos, to reduce file size.
 * Empty fields like description are omitted to further reduce file size.
 */
export interface SearchIndexItem {
  /** Unique identifier */
  id: number;
  /** Item type: 'GalleryAlbumItem' or 'GalleryPhotoItem' (currently only 'GalleryAlbumItem' is used) */
  type: 'GalleryAlbumItem' | 'GalleryPhotoItem';
  /** Item title */
  title: string;
  /** Item description (optional, only included if non-empty) */
  description?: string;
  /** Parent album ID (if applicable) */
  parentId?: number;
  /** Path component for navigation */
  pathComponent: string;
  /** Ancestor albums path (root omitted), e.g. "dreamhack/dreamhack 08/crew" */
  ancestors?: string;
}

/**
 * Search result with relevance score
 */
export interface SearchResult {
  /** The indexed item */
  item: SearchIndexItem;
  /** Relevance score (higher = more relevant) */
  score: number;
  /** Whether the match was in the title */
  matchedInTitle: boolean;
  /** Whether the match was in the description */
  matchedInDescription: boolean;
}

/**
 * Search index class for loading and querying search indexes
 */
export class SearchIndex {
  private index: Map<number, SearchIndexItem> = new Map();
  private loadPromise: Promise<void> | null = null;

  /**
   * Load search index from pre-built file
   *
   * @param rootAlbumId - Root album ID (kept for API compatibility, not used)
   * @returns Promise that resolves when index is loaded
   */
  async buildIndex(rootAlbumId: number): Promise<void> {
    // If already loading, return the existing promise
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // If already loaded, return immediately
    if (this.index.size > 0) {
      return Promise.resolve();
    }

    this.loadPromise = this._loadIndex();

    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Load index from pre-built file
   */
  private async _loadIndex(): Promise<void> {
    try {
      const indexData = await loadSearchIndex();

      if (!indexData) {
        // Index file not found - log warning but don't throw
        console.warn('Search index file not found. Search functionality will be unavailable.');
        return;
      }

      // Populate index map from loaded data
      for (const item of indexData.items) {
        this.index.set(item.id, item);
      }
    } catch (error) {
      // Log error but don't throw - allow search to work with empty index
      console.error('Failed to load search index:', error);
    }
  }

  /**
   * Search the index for items matching the query
   *
   * @param query - Search query string
   * @returns Array of search results sorted by relevance
   */
  search(query: string): SearchResult[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    for (const item of this.index.values()) {
      const titleLower = item.title.toLowerCase();
      const descriptionLower = item.description?.toLowerCase() ?? '';

      const matchedInTitle = titleLower.includes(normalizedQuery);
      const matchedInDescription = descriptionLower.length > 0 && descriptionLower.includes(normalizedQuery);

      if (matchedInTitle || matchedInDescription) {
        // Calculate relevance score
        // Title matches are worth more than description matches
        let score = 0;
        if (matchedInTitle) {
          score += 10;
          // Bonus for exact title match
          if (titleLower === normalizedQuery) {
            score += 5;
          }
          // Bonus for title starting with query
          if (titleLower.startsWith(normalizedQuery)) {
            score += 3;
          }
        }
        if (matchedInDescription) {
          score += 1;
        }

        results.push({
          item,
          score,
          matchedInTitle,
          matchedInDescription,
        });
      }
    }

    // Sort by score (descending), then by title (ascending)
    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.item.title.localeCompare(b.item.title);
    });

    // Limit to 100 results
    return results.slice(0, 100);
  }

  /**
   * Get an item from the index by ID
   *
   * @param id - Item ID
   * @returns Search index item or undefined if not found
   */
  getItem(id: number): SearchIndexItem | undefined {
    return this.index.get(id);
  }

  /**
   * Get the total number of items in the index
   *
   * @returns Number of indexed items
   */
  getItemCount(): number {
    return this.index.size;
  }

  /**
   * Clear the search index
   * Useful for testing
   */
  clear(): void {
    this.index.clear();
    this.loadPromise = null;
  }

  /**
   * Check if index is currently being built
   *
   * @returns Always returns false since index is pre-built and only loaded
   */
  isIndexBuilding(): boolean {
    return false;
  }
}
