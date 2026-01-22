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
import { useRetry, type UseRetryConfig } from './useRetry';
import type { Child } from '../../../types';

/**
 * Configuration for useAlbumData hook
 */
export interface UseAlbumDataConfig {
  /** Enable automatic retry on failure */
  enableAutoRetry?: boolean;
  /** Retry configuration (only used if enableAutoRetry is true) */
  retryConfig?: UseRetryConfig;
}

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
  /** Retry state (if retry is enabled) */
  retryState?: {
    retryCount: number;
    isRetrying: boolean;
    canRetry: boolean;
    retry: () => Promise<void>;
  };
}

/**
 * Hook to load album data by ID
 *
 * @param id - Album ID to load, or null to skip loading
 * @param config - Optional configuration for retry behavior
 * @returns Object with data, isLoading, error, refetch function, and optional retry state
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useAlbumData(7);
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * if (data) return <div>Loaded {data.length} items</div>;
 * ```
 *
 * @example
 * ```tsx
 * // With automatic retry
 * const { data, isLoading, error, retryState } = useAlbumData(7, {
 *   enableAutoRetry: true,
 *   retryConfig: { maxRetries: 3, initialDelay: 1000 }
 * });
 * ```
 */
export function useAlbumData(
  id: number | null,
  config: UseAlbumDataConfig = {},
): UseAlbumDataReturn {
  const { enableAutoRetry = false, retryConfig } = config;
  const [data, setData] = useState<Child[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<DataLoadError | null>(null);
  const isMountedRef = useRef(true);

  const currentIdRef = useRef<number | null>(id);

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
      throw err; // Re-throw for useRetry if enabled
    }
  }, []);

  // Create stable load function for retry hook using ref
  const loadDataForRetry = useCallback(async () => {
    const currentId = currentIdRef.current;
    if (currentId === null) {
      return;
    }
    await loadData(currentId);
  }, [loadData]);

  // Set up retry mechanism if enabled
  const retryHook = useRetry(
    loadDataForRetry,
    enableAutoRetry ? retryConfig : undefined,
  );

  // Update ref when id changes
  useEffect(() => {
    currentIdRef.current = id;
  }, [id]);

  // Auto-retry on error if enabled
  useEffect(() => {
    if (enableAutoRetry && error && id !== null && !isLoading && !retryHook.isRetrying) {
      // Only auto-retry if we haven't exceeded max retries
      if (retryHook.canRetry) {
        retryHook.retry().catch(() => {
          // Error already handled by loadData
        });
      }
    }
  }, [error, enableAutoRetry, id, isLoading, retryHook]);

  useEffect(() => {
    isMountedRef.current = true;

    // Don't load if id is null
    if (id === null) {
      setData(null);
      setIsLoading(false);
      setError(null);
      if (enableAutoRetry) {
        retryHook.reset();
      }
      return;
    }

    // Reset retry state when id changes
    if (enableAutoRetry) {
      retryHook.reset();
    }

    loadData(id).catch(() => {
      // Error handled in loadData
    });

    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, [id, loadData, enableAutoRetry, retryHook]);

  const refetch = useCallback(() => {
    if (id !== null) {
      // Reset retry state before refetching
      if (enableAutoRetry) {
        retryHook.reset();
      }
      loadData(id).catch(() => {
        // Error handled in loadData
      });
    }
  }, [id, loadData, enableAutoRetry, retryHook]);

  return {
    data,
    isLoading: isLoading || (enableAutoRetry ? retryHook.isRetrying : false),
    error,
    refetch,
    ...(enableAutoRetry
      ? {
          retryState: {
            retryCount: retryHook.retryCount,
            isRetrying: retryHook.isRetrying,
            canRetry: retryHook.canRetry,
            retry: retryHook.retry,
          },
        }
      : {}),
  };
}
