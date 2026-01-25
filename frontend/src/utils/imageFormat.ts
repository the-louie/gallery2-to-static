/**
 * Image Format Detection Utilities
 *
 * Note: Asset URLs are not swapped by format; the app loads only the image URLs
 * as provided in the data JSON (original format). This module is kept for possible future use.
 *
 * Provides functions to detect browser support for modern image formats
 * (WebP and AVIF) using canvas-based feature detection. Results are cached
 * to avoid repeated checks.
 *
 * ## Features
 *
 * - Canvas-based format detection for WebP and AVIF
 * - Cached results to improve performance
 * - Graceful fallback when canvas is unavailable
 * - Promise-based async detection
 *
 * ## Usage
 *
 * ```typescript
 * import { supportsWebP, supportsAVIF } from '@/utils/imageFormat';
 *
 * // Check format support (synchronous, uses cache)
 * if (supportsWebP()) {
 *   // Use WebP format
 * }
 *
 * // Detect format support (async, performs detection if needed)
 * const webpSupported = await detectWebPSupportAsync();
 * ```
 *
 * @module frontend/src/utils/imageFormat
 */

/**
 * Cache for format support detection results
 */
const formatSupportCache: {
  webp: boolean | null;
  avif: boolean | null;
} = {
  webp: null,
  avif: null,
};

/**
 * Detect WebP support using canvas-based feature detection
 *
 * Creates a small WebP image data URL and attempts to decode it.
 * If successful, the browser supports WebP.
 *
 * @returns Promise that resolves to true if WebP is supported, false otherwise
 */
async function detectWebPSupport(): Promise<boolean> {
  // Return cached result if available
  if (formatSupportCache.webp !== null) {
    return formatSupportCache.webp;
  }

  // Check if canvas is available
  if (typeof HTMLCanvasElement === 'undefined') {
    formatSupportCache.webp = false;
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    // WebP data URL (1x1 transparent WebP)
    const webpDataUrl =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        formatSupportCache.webp = true;
        resolve(true);
      };
      img.onerror = () => {
        formatSupportCache.webp = false;
        resolve(false);
      };
      img.src = webpDataUrl;
    });
  } catch (error) {
    // If detection fails, assume no support
    formatSupportCache.webp = false;
    return false;
  }
}

/**
 * Detect AVIF support using canvas-based feature detection
 *
 * Creates a small AVIF image data URL and attempts to decode it.
 * If successful, the browser supports AVIF.
 *
 * @returns Promise that resolves to true if AVIF is supported, false otherwise
 */
async function detectAVIFSupport(): Promise<boolean> {
  // Return cached result if available
  if (formatSupportCache.avif !== null) {
    return formatSupportCache.avif;
  }

  // Check if canvas is available
  if (typeof HTMLCanvasElement === 'undefined') {
    formatSupportCache.avif = false;
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    // AVIF data URL (1x1 transparent AVIF)
    const avifDataUrl =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        formatSupportCache.avif = true;
        resolve(true);
      };
      img.onerror = () => {
        formatSupportCache.avif = false;
        resolve(false);
      };
      img.src = avifDataUrl;
    });
  } catch (error) {
    // If detection fails, assume no support
    formatSupportCache.avif = false;
    return false;
  }
}

/**
 * Check if WebP is supported (synchronous, uses cache)
 *
 * Returns the cached result if available, otherwise returns false.
 * Use `detectWebPSupport()` for async detection.
 *
 * @returns True if WebP is supported (and cached), false otherwise
 */
export function supportsWebP(): boolean {
  return formatSupportCache.webp === true;
}

/**
 * Check if AVIF is supported (synchronous, uses cache)
 *
 * Returns the cached result if available, otherwise returns false.
 * Use `detectAVIFSupport()` for async detection.
 *
 * @returns True if AVIF is supported (and cached), false otherwise
 */
export function supportsAVIF(): boolean {
  return formatSupportCache.avif === true;
}

/**
 * Detect WebP support (async, exported)
 *
 * Performs detection if not already cached, otherwise returns cached result.
 *
 * @returns Promise that resolves to true if WebP is supported, false otherwise
 */
export async function detectWebPSupportAsync(): Promise<boolean> {
  return detectWebPSupport();
}

/**
 * Detect AVIF support (async, exported)
 *
 * Performs detection if not already cached, otherwise returns cached result.
 *
 * @returns Promise that resolves to true if AVIF is supported, false otherwise
 */
export async function detectAVIFSupportAsync(): Promise<boolean> {
  return detectAVIFSupport();
}

/**
 * Get the best supported format for an image
 *
 * Returns the best format based on browser support:
 * - AVIF (if supported)
 * - WebP (if supported)
 * - 'original' (fallback)
 *
 * @returns Promise that resolves to the best format: 'avif', 'webp', or 'original'
 */
export async function getBestFormat(): Promise<'avif' | 'webp' | 'original'> {
  const avifSupported = await detectAVIFSupportAsync();
  if (avifSupported) {
    return 'avif';
  }

  const webpSupported = await detectWebPSupportAsync();
  if (webpSupported) {
    return 'webp';
  }

  return 'original';
}
