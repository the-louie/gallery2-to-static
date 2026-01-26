/**
 * Progressive Image Loading Hook
 *
 * Loads thumbnail then full image; uses fetch + AbortSignal so in-flight GETs
 * are canceled on navigation. Object URLs are revoked on abort or cleanup.
 * Returns object URLs for display when available so each image is only fetched
 * once (no duplicate request from img src). Falls back to server URL when fetch
 * fails (e.g. CORS) for either thumbnail or full image.
 *
 * @module frontend/src/hooks/useProgressiveImage
 */

import { useState, useEffect, useRef } from 'react';
import type { Image } from '@/types';
import { getImageUrl } from '@/utils/imageUrl';
import { getImageCache } from '@/utils/imageCache';
import { fetchImageAsObjectUrl } from '@/utils/fetchImageAsObjectUrl';
import { useViewAbortSignal } from '@/contexts/ViewAbortContext';
import { useImageBaseUrl } from '@/contexts/ImageConfigContext';

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
  /** Thumbnail image URL for display (object URL when loaded, else '' or server URL fallback) */
  thumbnailUrl: string;
  /** Full image URL for display (object URL when loaded, else server URL) */
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
 * Loads thumbnail first, then full-resolution image. When blob load fails (e.g.
 * cross-origin security), falls back to server URL so the image still displays.
 * Uses only the image URLs as provided in the data (original format); no format variants (AVIF/WebP).
 *
 * @param image - Image object to load
 * @param useThumbnail - Whether to use thumbnail (default: true for progressive loading)
 * @returns Progressive image loading state and URLs
 */
export function useProgressiveImage(
  image: Image | null,
  useThumbnail: boolean = true,
): UseProgressiveImageReturn {
  const signal = useViewAbortSignal();
  const baseUrl = useImageBaseUrl();
  const [state, setState] = useState<ProgressiveImageState>('thumbnail');
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [fullImageUrl, setFullImageUrl] = useState<string>('');
  /** Display URL for thumbnail: object URL when loaded, else '' to avoid duplicate request */
  const [displayThumbnailUrl, setDisplayThumbnailUrl] = useState<string>('');
  /** Display URL for full image: object URL when loaded, else server URL (fallback) */
  const [displayFullImageUrl, setDisplayFullImageUrl] = useState<string>('');

  const thumbnailImgRef = useRef<HTMLImageElement | null>(null);
  const fullImgRef = useRef<HTMLImageElement | null>(null);
  const thumbnailObjectUrlRef = useRef<string | null>(null);
  const fullObjectUrlRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const currentImageIdRef = useRef<number | null>(null);
  const thumbnailTransitionDoneRef = useRef(false);

  // Reset state when image changes
  useEffect(() => {
    if (!image) {
      setState('error');
      setHasError(true);
      setError('No image provided');
      setThumbnailUrl('');
      setFullImageUrl('');
      setDisplayThumbnailUrl('');
      setDisplayFullImageUrl('');
      currentImageIdRef.current = null;
      return;
    }

    const imageId = image.id;
    currentImageIdRef.current = imageId;
    thumbnailTransitionDoneRef.current = false;
    isMountedRef.current = true;
    setState('thumbnail');
    setHasError(false);
    setError(null);
    setDisplayThumbnailUrl('');
    setDisplayFullImageUrl('');

    const thumbRequestUrl = getImageUrl(image, true, undefined, baseUrl);
    const fullUrl = getImageUrl(image, false, undefined, baseUrl);
    setThumbnailUrl(thumbRequestUrl);
    setFullImageUrl(fullUrl);

    return () => {
      isMountedRef.current = false;
      currentImageIdRef.current = null;
      if (thumbnailObjectUrlRef.current) {
        URL.revokeObjectURL(thumbnailObjectUrlRef.current);
        thumbnailObjectUrlRef.current = null;
      }
      if (fullObjectUrlRef.current) {
        URL.revokeObjectURL(fullObjectUrlRef.current);
        fullObjectUrlRef.current = null;
      }
      thumbnailImgRef.current = null;
      fullImgRef.current = null;
    };
  }, [image?.id, image?.pathComponent, image?.urlPath, baseUrl, signal]);

  // Load thumbnail (fetch + object URL when signal provided)
  useEffect(() => {
    if (!image || !thumbnailUrl || state !== 'thumbnail') {
      return;
    }

    const imageId = image.id;
    const cache = getImageCache();

    if (!useThumbnail) {
      if (currentImageIdRef.current === imageId && isMountedRef.current && !signal.aborted) {
        setState('thumbnail-loaded');
      }
      return;
    }

    const cachedThumbnail = cache.get(thumbnailUrl);
    if (cachedThumbnail) {
      if (currentImageIdRef.current === imageId && isMountedRef.current && !signal.aborted) {
        setDisplayThumbnailUrl(thumbnailUrl);
        setState('thumbnail-loaded');
      }
      return;
    }

    fetchImageAsObjectUrl(thumbnailUrl, signal)
      .then((objectUrl) => {
        if (signal.aborted || !isMountedRef.current || currentImageIdRef.current !== imageId) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        thumbnailObjectUrlRef.current = objectUrl;
        if (currentImageIdRef.current === imageId && isMountedRef.current && !signal.aborted) {
          setDisplayThumbnailUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
          thumbnailObjectUrlRef.current = null;
          return;
        }
        const img = new Image();
        thumbnailImgRef.current = img;
        img.onload = () => {
          if (!isMountedRef.current || currentImageIdRef.current !== imageId || signal.aborted) {
            if (signal.aborted && thumbnailObjectUrlRef.current) {
              URL.revokeObjectURL(thumbnailObjectUrlRef.current);
              thumbnailObjectUrlRef.current = null;
            }
            return;
          }
          if (thumbnailTransitionDoneRef.current) return;
          thumbnailTransitionDoneRef.current = true;
          cache.set(thumbnailUrl, img);
          setState('thumbnail-loaded');
        };
        img.onerror = () => {
          if (thumbnailObjectUrlRef.current) {
            URL.revokeObjectURL(thumbnailObjectUrlRef.current);
            thumbnailObjectUrlRef.current = null;
          }
          thumbnailImgRef.current = null;
          if (!isMountedRef.current || currentImageIdRef.current !== imageId || signal.aborted) return;
          if (thumbnailTransitionDoneRef.current) return;
          thumbnailTransitionDoneRef.current = true;
          // Fallback to server URL when blob fails (e.g. cross-origin security) so the image still displays.
          setDisplayThumbnailUrl(thumbnailUrl);
          setState('thumbnail-loaded');
        };
        img.src = objectUrl;
      })
      .catch((err) => {
        if (err?.name === 'AbortError') {
          return;
        }
        if (isMountedRef.current && currentImageIdRef.current === imageId && !signal.aborted) {
          setDisplayThumbnailUrl(thumbnailUrl);
          setState('thumbnail-loaded');
        }
      });

    return () => {
      if (thumbnailObjectUrlRef.current) {
        URL.revokeObjectURL(thumbnailObjectUrlRef.current);
        thumbnailObjectUrlRef.current = null;
      }
      thumbnailImgRef.current = null;
    };
  }, [image?.id, image?.pathComponent, image?.urlPath, useThumbnail, thumbnailUrl, state, signal]);

  // Load full image (fetch + object URL)
  useEffect(() => {
    if (!image || !fullImageUrl || state !== 'thumbnail-loaded') {
      return;
    }

    const imageId = image.id;
    const cache = getImageCache();
    const cachedFullImage = cache.get(fullImageUrl);
    if (cachedFullImage) {
      if (currentImageIdRef.current === imageId && isMountedRef.current && !signal.aborted) {
        setDisplayFullImageUrl(fullImageUrl);
        setState('full-loaded');
        setHasError(false);
        setError(null);
      }
      return;
    }

    fetchImageAsObjectUrl(fullImageUrl, signal)
      .then((objectUrl) => {
        if (signal.aborted || !isMountedRef.current || currentImageIdRef.current !== imageId) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        fullObjectUrlRef.current = objectUrl;
        if (currentImageIdRef.current === imageId && isMountedRef.current && !signal.aborted) {
          setDisplayFullImageUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
          fullObjectUrlRef.current = null;
          return;
        }
        const img = new Image();
        fullImgRef.current = img;
        img.onload = () => {
          if (!isMountedRef.current || currentImageIdRef.current !== imageId || signal.aborted) {
            if (signal.aborted && fullObjectUrlRef.current) {
              URL.revokeObjectURL(fullObjectUrlRef.current);
              fullObjectUrlRef.current = null;
            }
            return;
          }
          cache.set(fullImageUrl, img);
          setState('full-loaded');
          setHasError(false);
          setError(null);
        };
        img.onerror = () => {
          if (fullObjectUrlRef.current) {
            URL.revokeObjectURL(fullObjectUrlRef.current);
            fullObjectUrlRef.current = null;
          }
          fullImgRef.current = null;
          if (isMountedRef.current && currentImageIdRef.current === imageId && !signal.aborted) {
            // Fallback to server URL when blob fails (e.g. cross-origin security) so the image still displays.
            setDisplayFullImageUrl(fullImageUrl);
            setState('full-loaded');
            setHasError(false);
            setError(null);
          }
        };
        img.src = objectUrl;
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        // On fetch failure (e.g. CORS when loading from another origin), still show
        // full image via server URL so the lightbox can render <img src={fullImageUrl}>.
        if (isMountedRef.current && currentImageIdRef.current === imageId && !signal.aborted) {
          setDisplayFullImageUrl(fullImageUrl);
          setState('full-loaded');
          setHasError(false);
          setError(null);
        }
      });

    return () => {
      if (fullObjectUrlRef.current) {
        URL.revokeObjectURL(fullObjectUrlRef.current);
        fullObjectUrlRef.current = null;
      }
      fullImgRef.current = null;
    };
  }, [image?.id, image?.pathComponent, image?.urlPath, fullImageUrl, state, signal]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    thumbnailUrl: displayThumbnailUrl,
    fullImageUrl: displayFullImageUrl || fullImageUrl,
    state,
    hasError,
    error,
  };
}
