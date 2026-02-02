/**
 * Hook to load and access site metadata from index.json
 *
 * Loads the site name and other metadata from index.json and provides
 * it to components. Includes caching to avoid repeated fetches.
 *
 * @returns Object with siteName and loading state
 *
 * @example
 * ```tsx
 * const { siteName, isLoading } = useSiteMetadata();
 * if (siteName) {
 *   document.title = siteName;
 * }
 * ```
 */

import { useState, useEffect } from 'react';
import { loadIndex, type DataLoadError } from '@/utils/dataLoader';
import type { IndexMetadata } from '@/types';

interface UseSiteMetadataResult {
  siteName: string | null;
  siteDescription: string | null;
  rootAlbumId: number | null;
  isLoading: boolean;
  error: DataLoadError | null;
}

const cache: { data: IndexMetadata | null; promise: Promise<IndexMetadata | null> | null } = {
  data: null,
  promise: null,
};

export function useSiteMetadata(): UseSiteMetadataResult {
  const [siteName, setSiteName] = useState<string | null>(null);
  const [siteDescription, setSiteDescription] = useState<string | null>(null);
  const [rootAlbumId, setRootAlbumId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<DataLoadError | null>(null);

  useEffect(() => {
    // If we have cached data, use it immediately
    if (cache.data) {
      setSiteName(cache.data.siteName);
      setSiteDescription(cache.data.siteDescription ?? null);
      setRootAlbumId(cache.data.rootAlbumId);
      setIsLoading(false);
      return;
    }

    // If there's already a pending request, wait for it
    if (cache.promise) {
      cache.promise
        .then((index) => {
          if (index) {
            setSiteName(index.siteName);
            setSiteDescription(index.siteDescription ?? null);
            setRootAlbumId(index.rootAlbumId);
          }
          setIsLoading(false);
        })
        .catch((err) => {
          const loadError =
            err instanceof DataLoadError
              ? err
              : new DataLoadError(
                  'Failed to load site metadata',
                  'UNKNOWN_ERROR',
                  err,
                );
          setError(loadError);
          setIsLoading(false);
        });
      return;
    }

    // Start a new request
    setIsLoading(true);
    setError(null);
    cache.promise = loadIndex();

    cache.promise
      .then((index) => {
        cache.data = index;
        cache.promise = null;
        if (index) {
          setSiteName(index.siteName);
          setSiteDescription(index.siteDescription ?? null);
          setRootAlbumId(index.rootAlbumId);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        cache.promise = null;
        const loadError =
          err instanceof DataLoadError
            ? err
            : new DataLoadError(
                'Failed to load site metadata',
                'UNKNOWN_ERROR',
                err,
              );
        setError(loadError);
        setIsLoading(false);
      });
  }, []);

  return { siteName, siteDescription, rootAlbumId, isLoading, error };
}
