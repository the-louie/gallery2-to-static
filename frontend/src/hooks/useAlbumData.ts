/**
 * React hook for loading album data
 *
 * Provides loading, error, and data states for album JSON loading.
 * Handles cleanup and prevents memory leaks.
 *
 * ## Features
 *
 * - Automatic loading when ID changes
 * - Loading and error states
 * - Manual refetch capability
 * - Cleanup on unmount to prevent memory leaks (uses useRef to track mounted state)
 * - Skips loading when ID is null
 *
 * ## Cleanup Strategy
 *
 * Uses `useRef` to track component mount state instead of AbortController.
 * This approach prevents state updates after unmount, which is the primary
 * goal for preventing memory leaks. The fetch request itself is not canceled,
 * but state updates are prevented, which is sufficient for this use case.
 *
 * ## Usage
 *
 * ```tsx
 * function AlbumView({ albumId }: { albumId: number }) {
 *   const { data, isLoading, error, refetch } = useAlbumData(albumId);
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!data) return <div>No data</div>;
 *
 *   return (
 *     <div>
 *       <button onClick={refetch}>Reload</button>
 *       <AlbumList albums={data} />
 *     </div>
 *   );
 * }
 * ```
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { loadAlbum, type DataLoadError } from '../utils/dataLoader';
import type { Child } from '../../../types';

/**
 * Return type for useAlbumData hook
 */
export interface UseAlbumDataReturn {
  /** Loaded album data, null if not loaded yet or if id is null */
  data: Child[] | null;
  /** True while loading, false otherwise */
  isLoading: boolean;
  /** Error object if loading failed, null otherwise */
  error: DataLoadError | null;
  /** Function to manually reload the data */
  refetch: () => void;
}

/**
 * Hook to load album data by ID
 *
 * @param id - Album ID to load, or null to skip loading
 * @returns Object with data, isLoading, error, and refetch function
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useAlbumData(7);
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * if (data) return <div>Loaded {data.length} items</div>;
 * ```
 */
export function useAlbumData(id: number | null): UseAlbumDataReturn {
  const [data, setData] = useState<Child[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<DataLoadError | null>(null);
  const isMountedRef = useRef(true);

  const loadData = useCallback(async (albumId: number) => {
    if (!isMountedRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const loadedData = await loadAlbum(albumId);
      if (isMountedRef.current) {
        setData(loadedData);
        setIsLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const loadError =
          err instanceof DataLoadError
            ? err
            : new DataLoadError(
                `Failed to load album ${albumId}`,
                'UNKNOWN_ERROR',
                err,
              );
        setError(loadError);
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Don't load if id is null
    if (id === null) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    loadData(id);

    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, [id, loadData]);

  const refetch = useCallback(() => {
    if (id !== null) {
      loadData(id);
    }
  }, [id, loadData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
