/**
 * React hook for search functionality
 *
 * Provides search state management, index building, and search execution.
 * The search index is built lazily on first use to avoid blocking initial page load.
 *
 * ## Usage
 *
 * ```tsx
 * function SearchComponent() {
 *   const { search, results, isLoading, isIndexBuilding } = useSearch();
 *
 *   useEffect(() => {
 *     search('vacation');
 *   }, []);
 *
 *   if (isIndexBuilding) return <div>Building search index...</div>;
 *   if (isLoading) return <div>Searching...</div>;
 *
 *   return (
 *     <div>
 *       {results.map(result => (
 *         <div key={result.item.id}>{result.item.title}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SearchIndex, type SearchResult } from '../utils/searchIndex';
import { findRootAlbumId } from '../utils/dataLoader';

/**
 * Return type for useSearch hook
 */
export interface UseSearchReturn {
  /** Execute search with given query */
  search: (query: string) => void;
  /** Current search results */
  results: SearchResult[];
  /** True while building index */
  isIndexBuilding: boolean;
  /** True while executing search */
  isLoading: boolean;
  /** Current search query */
  query: string;
  /** Error if index building or search failed */
  error: Error | null;
  /** Get item count in index */
  getItemCount: () => number;
}

// Singleton search index instance
let searchIndexInstance: SearchIndex | null = null;

/**
 * Get or create the search index instance
 */
function getSearchIndex(): SearchIndex {
  if (!searchIndexInstance) {
    searchIndexInstance = new SearchIndex();
  }
  return searchIndexInstance;
}

/**
 * Hook to manage search state and index building
 *
 * @returns Object with search function, results, and loading states
 */
export function useSearch(): UseSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isIndexBuilding, setIsIndexBuilding] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const resultsCacheRef = useRef<Map<string, SearchResult[]>>(new Map());

  // Ensure component is marked as mounted
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Build search index if not already built
   */
  const ensureIndexBuilt = useCallback(async (): Promise<void> => {
    const index = getSearchIndex();

    // If already built, return immediately
    if (index.getItemCount() > 0 && !index.isIndexBuilding()) {
      return;
    }

    try {
      // Only set loading state if we're starting a new build
      if (!index.isIndexBuilding()) {
        setIsIndexBuilding(true);
      }
      setError(null);

      const rootAlbumId = await findRootAlbumId();
      if (!rootAlbumId) {
        throw new Error('Root album not found');
      }

      // buildIndex handles concurrent calls by returning existing promise
      await index.buildIndex(rootAlbumId);

      if (isMountedRef.current) {
        setIsIndexBuilding(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const searchError =
          err instanceof Error
            ? err
            : new Error('Failed to build search index');
        setError(searchError);
        setIsIndexBuilding(false);
      }
    }
  }, []);

  /**
   * Execute search with given query
   */
  const search = useCallback(
    async (searchQuery: string) => {
      if (!isMountedRef.current) {
        return;
      }

      setQuery(searchQuery);

      // Empty query returns empty results
      if (!searchQuery || searchQuery.trim().length === 0) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      const normalizedQuery = searchQuery.trim().toLowerCase();

      // Check cache first
      const cachedResults = resultsCacheRef.current.get(normalizedQuery);
      if (cachedResults !== undefined) {
        if (isMountedRef.current) {
          setResults(cachedResults);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Ensure index is built before searching
        await ensureIndexBuilt();

        if (!isMountedRef.current) {
          return;
        }

        const index = getSearchIndex();
        const searchResults = index.search(searchQuery);

        // Cache results
        resultsCacheRef.current.set(normalizedQuery, searchResults);

        if (isMountedRef.current) {
          setResults(searchResults);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMountedRef.current) {
          const searchError =
            err instanceof Error ? err : new Error('Search failed');
          setError(searchError);
          setIsLoading(false);
          setResults([]);
        }
      }
    },
    [ensureIndexBuilt],
  );

  /**
   * Get item count in index
   */
  const getItemCount = useCallback((): number => {
    const index = getSearchIndex();
    return index.getItemCount();
  }, []);

  return {
    search,
    results,
    isIndexBuilding,
    isLoading,
    query,
    error,
    getItemCount,
  };
}
