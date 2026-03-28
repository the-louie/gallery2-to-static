/**
 * Image Preloading Utility
 *
 * Provides functions to preload images for smooth navigation in the lightbox.
 * When an AbortSignal is provided, uses fetch + object URL so requests can be
 * canceled on navigation; otherwise uses Image + src for backward compatibility.
 * Preload may fail for cross-origin blobs that are blocked; useProgressiveImage
 * handles display via server URL fallback when blob fails at display time.
 * Integrates with the image cache.
 *
 * ## Features
 *
 * - Optional AbortSignal for cancellation on navigation
 * - Promise-based image preloading
 * - Cache-aware; revokes object URLs on abort and does not cache aborted loads
 *
 * @module frontend/src/utils/imagePreload
 */

import { getImageCache } from './imageCache';
import { fetchImageAsObjectUrl } from './fetchImageAsObjectUrl';

/** Maximum number of images to fetch simultaneously in preloadImages() */
export const MAX_CONCURRENT_PRELOADS = 4;

export interface PreloadImageOptions {
  /** When provided, use fetch+objectURL so the request can be aborted; revoke on abort */
  signal?: AbortSignal;
}

/**
 * Preload a single image by URL.
 * When signal is provided, uses fetch + object URL (cancelable); otherwise uses Image + src.
 * Caller must ensure signal is the view's AbortSignal so navigation cancels in-flight loads.
 *
 * @param url - The URL of the image to preload
 * @param options - Optional { signal } for cancellation
 * @returns Promise that resolves when image is loaded (or immediately if cached), rejects on error (AbortError not treated as failure by callers)
 */
export function preloadImage(url: string, options?: PreloadImageOptions): Promise<void> {
  const signal = options?.signal;

  if (!url) {
    return Promise.reject(new Error('Image URL is required'));
  }

  const cache = getImageCache();
  const cachedImage = cache.get(url);
  if (cachedImage) {
    return Promise.resolve();
  }

  if (signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  if (signal) {
    return fetchImageAsObjectUrl(url, signal).then(
      (objectUrl) => {
        if (signal.aborted) {
          URL.revokeObjectURL(objectUrl);
          return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            if (signal.aborted) {
              img.src = '';
              URL.revokeObjectURL(objectUrl);
              reject(new DOMException('Aborted', 'AbortError'));
              return;
            }
            cache.set(url, img);
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Failed to preload image: ${url}`));
          };
          img.src = objectUrl;
        });
      },
      (err) => {
        throw err;
      },
    );
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      cache.set(url, img);
      resolve();
    };
    img.onerror = () => {
      reject(new Error(`Failed to preload image: ${url}`));
    };
    img.src = url;
  });
}

/**
 * Preload multiple images with a concurrency limit.
 *
 * Fetches up to MAX_CONCURRENT_PRELOADS images simultaneously. Additional
 * URLs are queued and started as active fetches complete. This prevents
 * network saturation when preloading large batches.
 *
 * @param urls - Array of image URLs to preload
 * @param options - Optional { signal } for cancellation
 */
export function preloadImages(
  urls: string[],
  options?: PreloadImageOptions,
): Promise<void> {
  if (urls.length === 0) {
    return Promise.resolve();
  }

  if (urls.length <= MAX_CONCURRENT_PRELOADS) {
    // No limiting needed for small batches
    return Promise.all(urls.map((url) => preloadImage(url, options))).then(
      () => {},
    );
  }

  // Concurrency-limited execution
  const active = new Set<Promise<void>>();
  const allSettled: Promise<void>[] = [];

  let i = 0;

  async function enqueueNext(): Promise<void> {
    while (i < urls.length) {
      const url = urls[i++];
      const task = preloadImage(url, options).finally(() => {
        active.delete(task);
      });
      active.add(task);
      allSettled.push(task);

      if (active.size >= MAX_CONCURRENT_PRELOADS) {
        await Promise.race(active);
      }
    }
  }

  return enqueueNext()
    .then(() => Promise.all(allSettled))
    .then(() => {});
}
