/**
 * Image Cache Module
 *
 * Provides an in-memory image cache with LRU (Least Recently Used) eviction
 * strategy. The cache stores HTMLImageElement objects keyed by URL to improve
 * image load performance by avoiding redundant network requests.
 *
 * ## Features
 *
 * - In-memory cache using Map for O(1) lookups
 * - LRU eviction when cache size limit is reached
 * - Cache statistics (hit rate, miss count, eviction count)
 * - Configurable cache size limits
 * - Automatic cleanup of evicted entries
 *
 * ## Lifecycle
 *
 * Cache is cleared on navigation away from album/image view (see Layout effect).
 * Returning to an album may trigger re-load of images.
 *
 * ## Usage
 *
 * ```typescript
 * import { getImageCache } from '@/utils/imageCache';
 *
 * const cache = getImageCache();
 * const cachedImage = cache.get('/images/photo.jpg');
 * if (!cachedImage) {
 *   const img = new Image();
 *   img.src = '/images/photo.jpg';
 *   await new Promise((resolve) => { img.onload = resolve; });
 *   cache.set('/images/photo.jpg', img);
 * }
 * ```
 *
 * @module frontend/src/utils/imageCache
 */

/**
 * Cache entry metadata
 *
 * Stores the image element and metadata for cache management.
 */
interface CacheEntry {
  /** The cached image element */
  image: HTMLImageElement;
  /** Timestamp when entry was created */
  timestamp: number;
  /** Number of times this entry was accessed */
  accessCount: number;
  /** Estimated size in bytes (based on dimensions if available) */
  sizeEstimate: number;
}

/**
 * Cache configuration options
 */
export interface ImageCacheConfig {
  /** Maximum number of images to cache (default: 50) */
  maxSize: number;
  /** Whether to enable statistics tracking (default: true) */
  enableStats: boolean;
}

/**
 * Cache statistics
 */
export interface ImageCacheStats {
  /** Number of cache hits */
  hitCount: number;
  /** Number of cache misses */
  missCount: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Current cache size */
  size: number;
  /** Number of entries evicted */
  evictionCount: number;
}

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: ImageCacheConfig = {
  maxSize: 50,
  enableStats: true,
};

/**
 * Image Cache Class
 *
 * Implements an in-memory image cache with LRU eviction.
 * Uses a Map for O(1) lookups and maintains insertion order for LRU tracking.
 */
export class ImageCache {
  /** Cache storage: URL -> CacheEntry */
  private cache: Map<string, CacheEntry>;
  /** LRU tracking: ordered list of URLs (most recently used at end) */
  private lruOrder: string[];
  /** Cache configuration */
  private config: ImageCacheConfig;
  /** Cache statistics */
  private stats: ImageCacheStats;

  /**
   * Create a new image cache instance
   *
   * @param config - Cache configuration options
   */
  constructor(config: Partial<ImageCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.lruOrder = [];
    this.stats = {
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      size: 0,
      evictionCount: 0,
    };
  }

  /**
   * Get an image from the cache
   *
   * Updates LRU order to mark the entry as recently used.
   *
   * @param url - Image URL to retrieve
   * @returns Cached image element or null if not found
   */
  get(url: string): HTMLImageElement | null {
    if (!url) {
      return null;
    }

    const entry = this.cache.get(url);
    if (entry) {
      // Update LRU order: move to end (most recently used)
      this.updateLRUOrder(url);
      entry.accessCount++;
      this.updateStats(true);
      return entry.image;
    }

    this.updateStats(false);
    return null;
  }

  /**
   * Store an image in the cache
   *
   * If cache is full, evicts least recently used entry before storing.
   * Updates LRU order to mark the entry as recently used.
   *
   * @param url - Image URL (used as cache key)
   * @param image - Image element to cache
   */
  set(url: string, image: HTMLImageElement): void {
    if (!url || !image) {
      return;
    }

    // If entry already exists, update it
    if (this.cache.has(url)) {
      this.updateLRUOrder(url);
      return;
    }

    // Evict if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    // Estimate size based on image dimensions
    const sizeEstimate = this.estimateImageSize(image);

    // Create cache entry
    const entry: CacheEntry = {
      image,
      timestamp: Date.now(),
      accessCount: 1,
      sizeEstimate,
    };

    // Store in cache
    this.cache.set(url, entry);
    this.lruOrder.push(url);
    this.stats.size = this.cache.size;
  }

  /**
   * Check if an image URL is cached
   *
   * @param url - Image URL to check
   * @returns True if URL is cached, false otherwise
   */
  has(url: string): boolean {
    if (!url) {
      return false;
    }
    return this.cache.has(url);
  }

  /**
   * Remove an image from the cache.
   * Revokes object URLs (blob:) when evicting to avoid leaks.
   *
   * @param url - Image URL to remove
   * @returns True if entry was removed, false if not found
   */
  delete(url: string): boolean {
    if (!url) {
      return false;
    }

    const entry = this.cache.get(url);
    if (entry?.image?.src?.startsWith?.('blob:')) {
      URL.revokeObjectURL(entry.image.src);
    }

    const removed = this.cache.delete(url);
    if (removed) {
      const index = this.lruOrder.indexOf(url);
      if (index !== -1) {
        this.lruOrder.splice(index, 1);
      }
      this.stats.size = this.cache.size;
    }
    return removed;
  }

  /**
   * Clear all entries from the cache.
   * Revokes any object URLs (blob:) before clearing.
   */
  clear(): void {
    for (const [, entry] of this.cache) {
      if (entry?.image?.src?.startsWith?.('blob:')) {
        URL.revokeObjectURL(entry.image.src);
      }
    }
    this.cache.clear();
    this.lruOrder = [];
    if (this.config.enableStats) {
      this.stats = {
        hitCount: 0,
        missCount: 0,
        hitRate: 0,
        size: 0,
        evictionCount: 0,
      };
    } else {
      this.stats.size = 0;
    }
  }

  /**
   * Get current cache size
   *
   * @returns Number of entries in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics object
   */
  getStats(): ImageCacheStats {
    return { ...this.stats };
  }

  /**
   * Update LRU order for an accessed URL
   *
   * Moves the URL to the end of the LRU order array (most recently used).
   *
   * @param url - URL to mark as recently used
   */
  private updateLRUOrder(url: string): void {
    const index = this.lruOrder.indexOf(url);
    if (index !== -1) {
      // Remove from current position
      this.lruOrder.splice(index, 1);
    }
    // Add to end (most recently used)
    this.lruOrder.push(url);
  }

  /**
   * Evict least recently used entry
   *
   * Removes the first entry in LRU order (least recently used).
   * Updates statistics.
   */
  private evictLRU(): void {
    if (this.lruOrder.length === 0) {
      return;
    }

    // Get least recently used URL (first in array)
    const lruUrl = this.lruOrder[0];
    if (lruUrl) {
      // Remove from cache (use delete method to properly handle lruOrder removal)
      this.delete(lruUrl);
      this.stats.evictionCount++;
      // Note: delete() already updates this.stats.size, so no need to update again
    }
  }

  /**
   * Estimate image size in bytes
   *
   * Uses image dimensions if available, otherwise uses a default estimate.
   *
   * @param image - Image element
   * @returns Estimated size in bytes
   */
  private estimateImageSize(image: HTMLImageElement): number {
    // If dimensions are available, estimate: width * height * 4 bytes (RGBA)
    if (image.naturalWidth && image.naturalHeight) {
      return image.naturalWidth * image.naturalHeight * 4;
    }
    // Default estimate: 500KB for unknown size
    return 500 * 1024;
  }

  /**
   * Update cache statistics
   *
   * @param isHit - True if cache hit, false if cache miss
   */
  private updateStats(isHit: boolean): void {
    if (!this.config.enableStats) {
      return;
    }

    if (isHit) {
      this.stats.hitCount++;
    } else {
      this.stats.missCount++;
    }

    // Calculate hit rate
    const total = this.stats.hitCount + this.stats.missCount;
    if (total > 0) {
      this.stats.hitRate = this.stats.hitCount / total;
    }
  }
}

/**
 * Singleton cache instance
 */
let cacheInstance: ImageCache | null = null;

/**
 * Get the singleton image cache instance
 *
 * Creates a new instance with default configuration if one doesn't exist.
 *
 * @returns The singleton cache instance
 */
export function getImageCache(): ImageCache {
  if (!cacheInstance) {
    cacheInstance = new ImageCache();
  }
  return cacheInstance;
}

/**
 * Configure the image cache
 *
 * Creates a new cache instance with the provided configuration.
 * This should be called before the cache is first used.
 *
 * @param config - Cache configuration options
 * @returns The configured cache instance
 */
export function configureImageCache(config: Partial<ImageCacheConfig>): ImageCache {
  cacheInstance = new ImageCache(config);
  return cacheInstance;
}

/**
 * Reset the cache instance (useful for testing)
 *
 * @internal
 */
export function resetImageCache(): void {
  cacheInstance = null;
}
