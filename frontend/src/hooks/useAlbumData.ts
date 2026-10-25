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
 * - Cleanup on unmount to prevent memory leaks (uses requestId counter to discard stale requests)
 * - Skips loading when ID is null
 *
 * ## Cleanup Strategy
 *
 * Uses a request ID counter (`requestIdRef`) to discard results from stale
 * requests. Each time the album ID changes or refetch is called, the counter
 * increments, invalidating any in-flight requests from previous IDs. State
 * updates only proceed if the request's captured ID matches the current counter.
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
import { loadAlbum, DataLoadError } from '../utils/dataLoader';
import { useRetry, type UseRetryConfig } from './useRetry';
import type { Child, AlbumMetadata } from '../../../backend/types';

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
  /** Loaded album children (Child[]), null if not loaded yet or if id is null */
  data: Child[] | null;
  /** Album metadata from the loaded file, null if not loaded yet or if id is null */
  metadata: AlbumMetadata | null;
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
  const [metadata, setMetadata] = useState<AlbumMetadata | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<DataLoadError | null>(null);
  const requestIdRef = useRef(0);

  const currentIdRef = useRef<number | null>(id);

  const loadData = useCallback(
    async (albumId: number, requestId: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const file = await loadAlbum(albumId);
        if (requestId !== requestIdRef.current) return; // stale request
        setData(file.children);
        setMetadata(file.metadata);
        setIsLoading(false);
      } catch (err) {
        if (requestId !== requestIdRef.current) return; // stale request
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
        throw err; // Re-throw for useRetry if enabled
      }
    },
    [],
  );

  // Create stable load function for retry hook using ref
  const loadDataForRetry = useCallback(async () => {
    const currentId = currentIdRef.current;
    if (currentId === null) {
      return;
    }
    await loadData(currentId, requestIdRef.current);
  }, [loadData]);

  // Set up retry mechanism if enabled
  const retryHook = useRetry(
    loadDataForRetry,
    enableAutoRetry ? retryConfig : undefined,
  );

  // Destructure retryHook properties for stable dependencies
  // These functions are stable (wrapped in useCallback), but we destructure to avoid
  // including the entire retryHook object in dependency arrays
  const { isRetrying: isRetryingRetry, canRetry: canRetryRetry, retry: retryFn, reset: resetRetry } = retryHook;

  // Update ref when id changes
  useEffect(() => {
    currentIdRef.current = id;
  }, [id]);

  // Auto-retry on error if enabled
  useEffect(() => {
    if (enableAutoRetry && error && id !== null && !isLoading && !isRetryingRetry) {
      // Only auto-retry if we haven't exceeded max retries
      if (canRetryRetry) {
        retryFn().catch(() => {
          // Error already handled by loadData
        });
      }
    }
  }, [error, enableAutoRetry, id, isLoading, isRetryingRetry, canRetryRetry, retryFn]);

  useEffect(() => {
    // Don't load if id is null; the returned values are nulled below (derived, no state reset:
    // REFAC-01), and a request still in flight is invalidated by the previous effect's cleanup
    if (id === null) {
      if (enableAutoRetry) {
        resetRetry();
      }
      return;
    }

    // Increment request ID to invalidate any in-flight requests
    requestIdRef.current++;
    const thisRequestId = requestIdRef.current;

    // Reset retry state when id changes
    if (enableAutoRetry) {
      resetRetry();
    }

    loadData(id, thisRequestId).catch(() => {
      // Error handled in loadData
    });

    // Cleanup: invalidate this request so its results are discarded
    return () => {
      // requestIdRef is a request counter, not a DOM node: reading its *current* value here is the
      // point (only invalidate if no newer request has started since).
      if (requestIdRef.current === thisRequestId) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        requestIdRef.current++;
      }
    };
  }, [id, loadData, enableAutoRetry, resetRetry]);

  const refetch = useCallback(() => {
    if (id !== null) {
      // Reset retry state before refetching
      if (enableAutoRetry) {
        resetRetry();
      }
      requestIdRef.current++;
      loadData(id, requestIdRef.current).catch(() => {
        // Error handled in loadData
      });
    }
  }, [id, loadData, enableAutoRetry, resetRetry]);

  const idle = id === null;
  return {
    data: idle ? null : data,
    metadata: idle ? null : metadata,
    isLoading: idle ? false : isLoading || (enableAutoRetry ? retryHook.isRetrying : false),
    error: idle ? null : error,
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
