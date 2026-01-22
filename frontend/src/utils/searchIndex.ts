/**
 * Search index utility for albums and images
 *
 * Provides functionality to build a search index from all album/image data
 * and perform searches on titles and descriptions.
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
 * ## Index Building
 *
 * The index is built by recursively loading all album JSON files starting
 * from the root album. Each album and image is indexed with its title and
 * description for searching.
 *
 * ## Search Algorithm
 *
 * - Case-insensitive substring matching in title and description
 * - Results sorted by relevance (title matches first, then description matches)
 * - Limited to 100 results to prevent performance issues
 */

import { loadAlbum } from './dataLoader';
import type { Child } from '../../../backend/types';
import { isAlbum, isImage } from '@/types';

/**
 * Search index item representing an album or image in the search index
 */
export interface SearchIndexItem {
  /** Unique identifier */
  id: number;
  /** Item type: 'GalleryAlbumItem' or 'GalleryPhotoItem' */
  type: 'GalleryAlbumItem' | 'GalleryPhotoItem';
  /** Item title */
  title: string;
  /** Item description */
  description: string;
  /** Parent album ID (if applicable) */
  parentId?: number;
  /** Path component for navigation */
  pathComponent: string;
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
 * Search index class for building and querying search indexes
 */
export class SearchIndex {
  private index: Map<number, SearchIndexItem> = new Map();
  private isBuilding: boolean = false;
  private buildPromise: Promise<void> | null = null;

  /**
   * Build search index by recursively loading all albums and images
   *
   * @param rootAlbumId - Root album ID to start building from
   * @returns Promise that resolves when index is built
   */
  async buildIndex(rootAlbumId: number): Promise<void> {
    // If already building, return the existing promise
    if (this.isBuilding && this.buildPromise) {
      return this.buildPromise;
    }

    // If already built, return immediately
    if (this.index.size > 0 && !this.isBuilding) {
      return Promise.resolve();
    }

    this.isBuilding = true;
    this.buildPromise = this._buildIndexRecursive(rootAlbumId);

    try {
      await this.buildPromise;
    } finally {
      this.isBuilding = false;
      this.buildPromise = null;
    }
  }

  /**
   * Recursively build index from album tree
   */
  private async _buildIndexRecursive(
    albumId: number,
    parentId?: number,
  ): Promise<void> {
    try {
      const children = await loadAlbum(albumId);

      for (const child of children) {
        // Add item to index
        const indexItem: SearchIndexItem = {
          id: child.id,
          type: child.type as 'GalleryAlbumItem' | 'GalleryPhotoItem',
          title: child.title ?? '',
          description: child.description ?? '',
          parentId,
          pathComponent: child.pathComponent ?? '',
        };

        this.index.set(child.id, indexItem);

        // If it's an album with children, recursively load it
        if (isAlbum(child) && child.hasChildren) {
          await this._buildIndexRecursive(child.id, child.id);
        }
      }
    } catch (error) {
      // Log error but continue building index with available data
      console.warn(`Failed to load album ${albumId} for search index:`, error);
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
      const descriptionLower = item.description.toLowerCase();

      const matchedInTitle = titleLower.includes(normalizedQuery);
      const matchedInDescription = descriptionLower.includes(normalizedQuery);

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
    this.isBuilding = false;
    this.buildPromise = null;
  }

  /**
   * Check if index is currently being built
   *
   * @returns True if index is being built
   */
  isIndexBuilding(): boolean {
    return this.isBuilding;
  }
}
