/**
 * React hook for accessing the image cache
 *
 * Provides access to the singleton image cache instance and statistics.
 * The cache is shared across all components using this hook.
 *
 * ## Features
 *
 * - Access to cache instance
 * - Cache statistics
 * - Cache operations (get, set, clear)
 * - Memoized to prevent unnecessary re-renders
 *
 * ## Usage
 *
 * ```tsx
 * import { useImageCache } from '@/hooks/useImageCache';
 *
 * function MyComponent() {
 *   const { cache, stats } = useImageCache();
 *
 *   const handleImageLoad = (url: string, image: HTMLImageElement) => {
 *     cache.set(url, image);
 *   };
 *
 *   return <div>Hit rate: {stats.hitRate.toFixed(2)}</div>;
 * }
 * ```
 *
 * @module frontend/src/hooks/useImageCache
 */

import { useMemo } from 'react';
import { getImageCache, type ImageCacheStats, type ImageCache } from '@/utils/imageCache';

/**
 * Return type for useImageCache hook
 */
export interface UseImageCacheReturn {
  /** The cache instance */
  cache: ImageCache;
  /** Current cache statistics */
  stats: ImageCacheStats;
  /** Get an image from cache */
  get: (url: string) => HTMLImageElement | null;
  /** Store an image in cache */
  set: (url: string, image: HTMLImageElement) => void;
  /** Check if URL is cached */
  has: (url: string) => boolean;
  /** Remove an image from cache */
  delete: (url: string) => boolean;
  /** Clear all cache entries */
  clear: () => void;
  /** Get current cache size */
  size: () => number;
}

/**
 * Hook to access the image cache
 *
 * Returns the singleton cache instance and provides convenient
 * cache operations. The cache instance is memoized to prevent
 * unnecessary re-renders.
 *
 * @returns Cache instance, statistics, and operations
 *
 * @example
 * ```tsx
 * const { cache, stats, get, set } = useImageCache();
 *
 * // Use cache operations
 * const cached = get('/images/photo.jpg');
 * if (!cached) {
 *   // Load and cache
 *   const img = new Image();
 *   img.src = '/images/photo.jpg';
 *   img.onload = () => set('/images/photo.jpg', img);
 * }
 * ```
 */
export function useImageCache(): UseImageCacheReturn {
  // Get cache instance (memoized to prevent re-creation)
  const cache = useMemo(() => getImageCache(), []);

  // Get statistics (memoized, but will update when cache changes)
  // Note: stats are not reactive - they update when cache operations occur
  const stats = useMemo(() => cache.getStats(), []);

  // Memoize cache operations
  const cacheOperations = useMemo(
    () => ({
      get: (url: string) => cache.get(url),
      set: (url: string, image: HTMLImageElement) => cache.set(url, image),
      has: (url: string) => cache.has(url),
      delete: (url: string) => cache.delete(url),
      clear: () => cache.clear(),
      size: () => cache.size(),
    }),
    [cache],
  );

  return {
    cache,
    stats,
    ...cacheOperations,
  };
}
