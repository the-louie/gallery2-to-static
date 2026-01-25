/**
 * Progressive Image Loading Hook
 *
 * Loads thumbnail then full image; uses fetch + AbortSignal so in-flight GETs
 * are canceled on navigation. Object URLs are revoked on abort or cleanup.
 *
 * @module frontend/src/hooks/useProgressiveImage
 */

import { useState, useEffect, useRef } from 'react';
import type { Image } from '@/types';
import { getImageUrl, getImageUrlWithFormat } from '@/utils/imageUrl';
import { getBestFormat } from '@/utils/imageFormat';
import { getImageCache } from '@/utils/imageCache';
import { fetchImageAsObjectUrl } from '@/utils/fetchImageAsObjectUrl';
import { useViewAbortSignal } from '@/contexts/ViewAbortContext';

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
  const signal = useViewAbortSignal();
  const [state, setState] = useState<ProgressiveImageState>('thumbnail');
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [fullImageUrl, setFullImageUrl] = useState<string>('');
  const [format, setFormat] = useState<'webp' | 'avif' | 'original'>('original');

  const thumbnailImgRef = useRef<HTMLImageElement | null>(null);
  const fullImgRef = useRef<HTMLImageElement | null>(null);
  const thumbnailObjectUrlRef = useRef<string | null>(null);
  const fullObjectUrlRef = useRef<string | null>(null);
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

    const thumbRequestUrl = getImageUrl(image, true);
    setThumbnailUrl(thumbRequestUrl);

    getBestFormat()
      .then((bestFormat) => {
        if (!isMountedRef.current || currentImageIdRef.current !== imageId || signal.aborted) {
          return;
        }
        formatDetectionDoneRef.current = true;
        setFormat(bestFormat);
        const fullUrl = getImageUrlWithFormat(image, false, bestFormat);
        setFullImageUrl(fullUrl);
      })
      .catch((err) => {
        if (!isMountedRef.current || currentImageIdRef.current !== imageId || signal.aborted) {
          return;
        }
        formatDetectionDoneRef.current = true;
        setFormat('original');
        const fullUrl = getImageUrl(image, false);
        setFullImageUrl(fullUrl);
      });

    return () => {
      isMountedRef.current = false;
      currentImageIdRef.current = null;
      if (thumbnailImgRef.current) {
        thumbnailImgRef.current.src = '';
      }
      if (fullImgRef.current) {
        fullImgRef.current.src = '';
      }
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
  }, [image?.id, image?.pathComponent, image?.urlPath, signal]);

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
        const img = new Image();
        thumbnailImgRef.current = img;
        img.onload = () => {
          if (!isMountedRef.current || currentImageIdRef.current !== imageId || signal.aborted) {
            if (signal.aborted && thumbnailObjectUrlRef.current) {
              URL.revokeObjectURL(thumbnailObjectUrlRef.current);
              thumbnailObjectUrlRef.current = null;
              img.src = '';
            }
            return;
          }
          cache.set(thumbnailUrl, img);
          setThumbnailUrl(objectUrl);
          setState('thumbnail-loaded');
        };
        img.onerror = () => {
          if (thumbnailObjectUrlRef.current) {
            URL.revokeObjectURL(thumbnailObjectUrlRef.current);
            thumbnailObjectUrlRef.current = null;
          }
          img.src = '';
          if (isMountedRef.current && currentImageIdRef.current === imageId && !signal.aborted) {
            setState('thumbnail-loaded');
          }
        };
        img.src = objectUrl;
      })
      .catch((err) => {
        if (err?.name === 'AbortError') {
          return;
        }
        if (isMountedRef.current && currentImageIdRef.current === imageId && !signal.aborted) {
          setState('thumbnail-loaded');
        }
      });

    return () => {
      if (thumbnailImgRef.current) {
        thumbnailImgRef.current.src = '';
      }
      if (thumbnailObjectUrlRef.current) {
        URL.revokeObjectURL(thumbnailObjectUrlRef.current);
        thumbnailObjectUrlRef.current = null;
      }
    };
  }, [image, useThumbnail, thumbnailUrl, state, signal]);

  // Load full image (fetch + object URL)
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
    const cachedFullImage = cache.get(fullImageUrl);
    if (cachedFullImage) {
      if (currentImageIdRef.current === imageId && isMountedRef.current && !signal.aborted) {
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
        const img = new Image();
        fullImgRef.current = img;
        img.onload = () => {
          if (!isMountedRef.current || currentImageIdRef.current !== imageId || signal.aborted) {
            if (signal.aborted && fullObjectUrlRef.current) {
              URL.revokeObjectURL(fullObjectUrlRef.current);
              fullObjectUrlRef.current = null;
              img.src = '';
            }
            return;
          }
          cache.set(fullImageUrl, img);
          setFullImageUrl(objectUrl);
          setState('full-loaded');
          setHasError(false);
          setError(null);
        };
        img.onerror = () => {
          if (fullObjectUrlRef.current) {
            URL.revokeObjectURL(fullObjectUrlRef.current);
            fullObjectUrlRef.current = null;
          }
          img.src = '';
          if (!isMountedRef.current || currentImageIdRef.current !== imageId || signal.aborted) {
            return;
          }
          if (format !== 'original') {
            const originalUrl = getImageUrl(image, false);
            const cachedOriginal = cache.get(originalUrl);
            if (cachedOriginal) {
              setFullImageUrl(originalUrl);
              setFormat('original');
              setState('full-loaded');
              setHasError(false);
              setError(null);
              return;
            }
            fetchImageAsObjectUrl(originalUrl, signal)
              .then((fallbackObjectUrl) => {
                if (signal.aborted || !isMountedRef.current || currentImageIdRef.current !== imageId) {
                  URL.revokeObjectURL(fallbackObjectUrl);
                  return;
                }
                fullObjectUrlRef.current = fallbackObjectUrl;
                const fallbackImg = new Image();
                fullImgRef.current = fallbackImg;
                fallbackImg.onload = () => {
                  if (!isMountedRef.current || currentImageIdRef.current !== imageId || signal.aborted) {
                    if (signal.aborted) {
                      if (fullObjectUrlRef.current) {
                        URL.revokeObjectURL(fullObjectUrlRef.current);
                        fullObjectUrlRef.current = null;
                      }
                      fallbackImg.src = '';
                    }
                    return;
                  }
                  cache.set(originalUrl, fallbackImg);
                  setFullImageUrl(fallbackObjectUrl);
                  setFormat('original');
                  setState('full-loaded');
                  setHasError(false);
                  setError(null);
                };
                fallbackImg.onerror = () => {
                  URL.revokeObjectURL(fallbackObjectUrl);
                  fallbackImg.src = '';
                  if (isMountedRef.current && currentImageIdRef.current === imageId && !signal.aborted) {
                    setState('error');
                    setHasError(true);
                    setError('Failed to load image');
                  }
                };
                fallbackImg.src = fallbackObjectUrl;
              })
              .catch((fallbackErr) => {
                if (fallbackErr?.name === 'AbortError') return;
                if (isMountedRef.current && currentImageIdRef.current === imageId && !signal.aborted) {
                  setState('error');
                  setHasError(true);
                  setError('Failed to load image');
                }
              });
          } else {
            setState('error');
            setHasError(true);
            setError('Failed to load image');
          }
        };
        img.src = objectUrl;
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        if (isMountedRef.current && currentImageIdRef.current === imageId && !signal.aborted) {
          setState('error');
          setHasError(true);
          setError('Failed to load image');
        }
      });

    return () => {
      if (fullImgRef.current) {
        fullImgRef.current.src = '';
      }
      if (fullObjectUrlRef.current) {
        URL.revokeObjectURL(fullObjectUrlRef.current);
        fullObjectUrlRef.current = null;
      }
    };
  }, [image, fullImageUrl, state, format, signal]);

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
