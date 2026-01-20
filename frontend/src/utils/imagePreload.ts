/**
 * Image Preloading Utility
 *
 * Provides functions to preload images for smooth navigation in the lightbox.
 * Uses the Image object API to load images into browser cache before they are needed.
 *
 * ## Features
 *
 * - Promise-based image preloading
 * - Error handling for failed loads
 * - Memory-efficient implementation
 *
 * ## Usage
 *
 * ```tsx
 * import { preloadImage } from '@/utils/imagePreload';
 *
 * // Preload a single image
 * preloadImage('/images/album/photo.jpg')
 *   .then(() => console.log('Image preloaded'))
 *   .catch((error) => console.error('Preload failed', error));
 * ```
 *
 * @module frontend/src/utils/imagePreload
 */

/**
 * Preload a single image by URL
 *
 * Creates an Image object and loads the image into browser cache.
 * Returns a Promise that resolves when the image is loaded or rejects on error.
 *
 * @param url - The URL of the image to preload
 * @returns Promise that resolves when image is loaded, rejects on error
 *
 * @example
 * ```typescript
 * preloadImage('/images/album/photo.jpg')
 *   .then(() => {
 *     // Image is now in browser cache
 *   })
 *   .catch((error) => {
 *     // Handle preload error
 *   });
 * ```
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('Image URL is required'));
      return;
    }

    const img = new Image();

    img.onload = () => {
      resolve();
    };

    img.onerror = () => {
      reject(new Error(`Failed to preload image: ${url}`));
    };

    // Start loading the image
    img.src = url;
  });
}

/**
 * Preload multiple images
 *
 * Preloads an array of image URLs. Returns a Promise that resolves when all
 * images are loaded or rejects if any image fails to load.
 *
 * @param urls - Array of image URLs to preload
 * @returns Promise that resolves when all images are loaded, rejects on first error
 *
 * @example
 * ```typescript
 * const urls = ['/images/photo1.jpg', '/images/photo2.jpg'];
 * preloadImages(urls)
 *   .then(() => {
 *     // All images are now in browser cache
 *   })
 *   .catch((error) => {
 *     // Handle preload error
 *   });
 * ```
 */
export function preloadImages(urls: string[]): Promise<void> {
  if (urls.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(urls.map((url) => preloadImage(url))).then(() => {
    // All images loaded successfully
  });
}
