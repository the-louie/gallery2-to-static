/**
 * React hook for loading breadcrumb path
 *
 * Provides loading, error, and data states for breadcrumb path building.
 * Handles cleanup and prevents memory leaks.
 *
 * ## Features
 *
 * - Automatic loading when album ID changes
 * - Loading and error states
 * - Manual refetch capability
 * - Cleanup on unmount to prevent memory leaks
 * - Skips loading when album ID is null
 *
 * ## Cleanup Strategy
 *
 * Uses `useRef` to track component mount state instead of AbortController.
 * This approach prevents state updates after unmount, which is the primary
 * goal for preventing memory leaks. The async operation itself is not canceled,
 * but state updates are prevented, which is sufficient for this use case.
 *
 * ## Usage
 *
 * ```tsx
 * function AlbumView({ albumId }: { albumId: number }) {
 *   const { path, isLoading, error, refetch } = useBreadcrumbPath(albumId);
 *
 *   if (isLoading) return <div>Loading breadcrumbs...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!path || path.length === 0) return null;
 *
 *   return <Breadcrumbs path={path} />;
 * }
 * ```
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { buildBreadcrumbPath } from '../utils/breadcrumbPath';
import type { BreadcrumbPath } from '../types';

/**
 * Return type for useBreadcrumbPath hook
 */
export interface UseBreadcrumbPathReturn {
  /** Breadcrumb path, null if not loaded yet or if albumId is null */
  path: BreadcrumbPath | null;
  /** True while loading, false otherwise */
  isLoading: boolean;
  /** Error object if loading failed, null otherwise */
  error: Error | null;
  /** Function to manually reload the path */
  refetch: () => void;
}

/**
 * Hook to load breadcrumb path by album ID
 *
 * @param albumId - Album ID to build path for, or null to skip loading
 * @returns Object with path, isLoading, error, and refetch function
 *
 * @example
 * ```tsx
 * const { path, isLoading, error } = useBreadcrumbPath(7);
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * if (path) return <Breadcrumbs path={path} />;
 * ```
 */
export function useBreadcrumbPath(
  albumId: number | null,
): UseBreadcrumbPathReturn {
  const [path, setPath] = useState<BreadcrumbPath | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const loadPath = useCallback(async (id: number) => {
    if (!isMountedRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const loadedPath = await buildBreadcrumbPath(id);
      if (isMountedRef.current) {
        setPath(loadedPath);
        setIsLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const loadError =
          err instanceof Error
            ? err
            : new Error(`Failed to load breadcrumb path for album ${id}`);
        setError(loadError);
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Don't load if albumId is null
    if (albumId === null) {
      setPath(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    loadPath(albumId);

    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, [albumId, loadPath]);

  const refetch = useCallback(() => {
    if (albumId !== null) {
      loadPath(albumId);
    }
  }, [albumId, loadPath]);

  return {
    path,
    isLoading,
    error,
    refetch,
  };
}
