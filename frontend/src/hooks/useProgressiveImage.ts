/**
 * Progressive Image Loading Hook
 *
 * Manages progressive image loading with blur-up technique. Loads thumbnail first,
 * then transitions to full-resolution image. Supports format detection and fallback.
 *
 * ## Features
 *
 * - Loads thumbnail image first (for blur-up effect)
 * - Loads full-resolution image in background
 * - Smooth transition from thumbnail to full image
 * - Format detection and fallback (AVIF → WebP → Original)
 * - Error handling for both thumbnail and full image
 * - State management for loading progress
 *
 * ## Usage
 *
 * ```tsx
 * import { useProgressiveImage } from '@/hooks/useProgressiveImage';
 *
 * function MyComponent({ image }: { image: Image }) {
 *   const {
 *     thumbnailUrl,
 *     fullImageUrl,
 *     state,
 *     hasError,
 *   } = useProgressiveImage(image);
 *
 *   return (
 *     <div>
 *       <img src={thumbnailUrl} className="blurred" />
 *       {state === 'full-loaded' && (
 *         <img src={fullImageUrl} className="fade-in" />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @module frontend/src/hooks/useProgressiveImage
 */

import { useState, useEffect, useRef } from 'react';
import type { Image } from '@/types';
import { getImageUrl, getImageUrlWithFormat } from '@/utils/imageUrl';
import { getBestFormat } from '@/utils/imageFormat';
import { getImageCache } from '@/utils/imageCache';

/**
 * Progressive loading state
 *
 * - 'thumbnail': Thumbnail is loading
 * - 'thumbnail-loaded': Thumbnail loaded, full image loading
 * - 'full-loaded': Full image loaded
 * - 'error': Error occurred (thumbnail or full image failed)
 */
export type ProgressiveImageState =
  | 'thumbnail'
  | 'thumbnail-loaded'
  | 'full-loaded'
  | 'error';

/**
 * Return type for useProgressiveImage hook
 */
export interface UseProgressiveImageReturn {
  /** Thumbnail image URL */
  thumbnailUrl: string;
  /** Full image URL (with best format) */
  fullImageUrl: string;
  /** Current loading state */
  state: ProgressiveImageState;
  /** Whether an error occurred */
  hasError: boolean;
  /** Error message if error occurred */
  error: string | null;
}

/**
 * Hook for progressive image loading with blur-up
 *
 * Loads thumbnail first, then full-resolution image. Automatically detects
 * best format (AVIF → WebP → Original) and uses format fallback.
 *
 * @param image - Image object to load
 * @param useThumbnail - Whether to use thumbnail (default: true for progressive loading)
 * @returns Progressive image loading state and URLs
 */
export function useProgressiveImage(
  image: Image | null,
  useThumbnail: boolean = true,
): UseProgressiveImageReturn {
  const [state, setState] = useState<ProgressiveImageState>('thumbnail');
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [fullImageUrl, setFullImageUrl] = useState<string>('');
  const [format, setFormat] = useState<'webp' | 'avif' | 'original'>('original');

  const thumbnailImgRef = useRef<HTMLImageElement | null>(null);
  const fullImgRef = useRef<HTMLImageElement | null>(null);
  const isMountedRef = useRef(true);
  const formatDetectionDoneRef = useRef(false);
  const currentImageIdRef = useRef<number | null>(null);

  // Reset state when image changes
  useEffect(() => {
    if (!image) {
      setState('error');
      setHasError(true);
      setError('No image provided');
      currentImageIdRef.current = null;
      return;
    }

    const imageId = image.id;
    currentImageIdRef.current = imageId;
    isMountedRef.current = true;
    formatDetectionDoneRef.current = false;
    setState('thumbnail');
    setHasError(false);
    setError(null);

    // Generate thumbnail URL immediately
    const thumbUrl = getImageUrl(image, true);
    setThumbnailUrl(thumbUrl);

    // Detect best format asynchronously
    getBestFormat()
      .then((bestFormat) => {
        // Check if this callback is still for the current image
        if (!isMountedRef.current || currentImageIdRef.current !== imageId) {
          return;
        }

        formatDetectionDoneRef.current = true;
        setFormat(bestFormat);

        // Generate full image URL with best format
        const fullUrl = getImageUrlWithFormat(image, false, bestFormat);
        setFullImageUrl(fullUrl);
      })
      .catch((err) => {
        // Check if this callback is still for the current image
        if (!isMountedRef.current || currentImageIdRef.current !== imageId) {
          return;
        }

        // If format detection fails, use original format
        formatDetectionDoneRef.current = true;
        setFormat('original');
        const fullUrl = getImageUrl(image, false);
        setFullImageUrl(fullUrl);
      });

    return () => {
      isMountedRef.current = false;
      currentImageIdRef.current = null;
      // Clean up image references
      if (thumbnailImgRef.current) {
        thumbnailImgRef.current.onload = null;
        thumbnailImgRef.current.onerror = null;
        thumbnailImgRef.current = null;
      }
      if (fullImgRef.current) {
        fullImgRef.current.onload = null;
        fullImgRef.current.onerror = null;
        fullImgRef.current = null;
      }
    };
  }, [image?.id, image?.pathComponent]);

  // Load thumbnail image (or skip if useThumbnail is false)
  useEffect(() => {
    if (!image || !thumbnailUrl || state !== 'thumbnail') {
      return;
    }

    const imageId = image.id;

    // If not using thumbnail, skip directly to full image loading
    if (!useThumbnail) {
      if (currentImageIdRef.current === imageId) {
        setState('thumbnail-loaded');
      }
      return;
    }

    // Check cache first
    const cache = getImageCache();
    const cachedThumbnail = cache.get(thumbnailUrl);
    if (cachedThumbnail) {
      // Thumbnail is cached, update state immediately
      if (currentImageIdRef.current === imageId && isMountedRef.current) {
        setState('thumbnail-loaded');
      }
      return;
    }

    // Thumbnail not in cache, load it
    const img = new Image();
    thumbnailImgRef.current = img;

    img.onload = () => {
      // Check if this callback is still for the current image
      if (!isMountedRef.current || currentImageIdRef.current !== imageId) {
        return;
      }
      // Store in cache after successful load
      cache.set(thumbnailUrl, img);
      setState('thumbnail-loaded');
    };

    img.onerror = () => {
      // Check if this callback is still for the current image
      if (!isMountedRef.current || currentImageIdRef.current !== imageId) {
        return;
      }
      // If thumbnail fails, continue to full image loading
      // This allows graceful degradation
      setState('thumbnail-loaded');
    };

    img.src = thumbnailUrl;
  }, [image, useThumbnail, thumbnailUrl, state]);

  // Load full image when thumbnail is loaded and format is detected
  useEffect(() => {
    if (
      !image ||
      !fullImageUrl ||
      state !== 'thumbnail-loaded' ||
      !formatDetectionDoneRef.current
    ) {
      return;
    }

    const imageId = image.id;
    const cache = getImageCache();

    // Check cache first
    const cachedFullImage = cache.get(fullImageUrl);
    if (cachedFullImage) {
      // Full image is cached, update state immediately
      if (currentImageIdRef.current === imageId && isMountedRef.current) {
        setState('full-loaded');
        setHasError(false);
        setError(null);
      }
      return;
    }

    // Full image not in cache, load it
    const img = new Image();
    fullImgRef.current = img;

    img.onload = () => {
      // Check if this callback is still for the current image
      if (!isMountedRef.current || currentImageIdRef.current !== imageId) {
        return;
      }
      // Store in cache after successful load
      cache.set(fullImageUrl, img);
      setState('full-loaded');
      setHasError(false);
      setError(null);
    };

    img.onerror = () => {
      // Check if this callback is still for the current image
      if (!isMountedRef.current || currentImageIdRef.current !== imageId) {
        return;
      }

      // Try fallback to original format if format variant failed
      if (format !== 'original') {
        const originalUrl = getImageUrl(image, false);

        // Check cache for original format
        const cachedOriginal = cache.get(originalUrl);
        if (cachedOriginal) {
          // Original format is cached, use it
          if (currentImageIdRef.current === imageId && isMountedRef.current) {
            setFullImageUrl(originalUrl);
            setFormat('original');
            setState('full-loaded');
            setHasError(false);
            setError(null);
          }
          return;
        }

        // Original format not in cache, load it
        const fallbackImg = new Image();
        fullImgRef.current = fallbackImg;

        fallbackImg.onload = () => {
          // Check if this callback is still for the current image
          if (!isMountedRef.current || currentImageIdRef.current !== imageId) {
            return;
          }
          // Store in cache after successful load
          cache.set(originalUrl, fallbackImg);
          setFullImageUrl(originalUrl);
          setFormat('original');
          setState('full-loaded');
          setHasError(false);
          setError(null);
        };

        fallbackImg.onerror = () => {
          // Check if this callback is still for the current image
          if (!isMountedRef.current || currentImageIdRef.current !== imageId) {
            return;
          }
          setState('error');
          setHasError(true);
          setError('Failed to load image');
        };

        fallbackImg.src = originalUrl;
      } else {
        // Original format also failed
        setState('error');
        setHasError(true);
        setError('Failed to load image');
      }
    };

    img.src = fullImageUrl;
  }, [image, fullImageUrl, state, format]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    thumbnailUrl,
    fullImageUrl,
    state,
    hasError,
    error,
  };
}
