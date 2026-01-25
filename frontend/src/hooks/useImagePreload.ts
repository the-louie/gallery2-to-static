/**
 * React hook for preloading adjacent images in an album
 *
 * Uses the view AbortSignal so in-flight preloads are canceled on navigation.
 * Preloads next and previous only (bounded). Does not update state; errors and
 * AbortError are handled silently.
 *
 * @module frontend/src/hooks/useImagePreload
 */

import { useEffect, useRef } from 'react';
import type { Image } from '@/types';
import { getImageUrl } from '@/utils/imageUrl';
import { preloadImage } from '@/utils/imagePreload';
import { useViewAbortSignal } from '@/contexts/ViewAbortContext';

/**
 * Preloads next and previous images when the current image changes.
 * Passes the view AbortSignal so navigation cancels in-flight GETs.
 */
export function useImagePreload(
  currentImage: Image | null,
  albumContext: Image[],
): void {
  const signal = useViewAbortSignal();
  const preloadAbortRef = useRef<boolean>(false);

  useEffect(() => {
    preloadAbortRef.current = false;

    if (!currentImage || albumContext.length <= 1) {
      return;
    }

    const currentIndex = albumContext.findIndex(
      (img) => img.id === currentImage.id,
    );
    if (currentIndex === -1) {
      return;
    }

    const imagesToPreload: Image[] = [];
    if (currentIndex < albumContext.length - 1) {
      imagesToPreload.push(albumContext[currentIndex + 1]);
    }
    if (currentIndex > 0) {
      imagesToPreload.push(albumContext[currentIndex - 1]);
    }

    imagesToPreload.forEach((image) => {
      const imageUrl = getImageUrl(image, false);
      preloadImage(imageUrl, { signal }).catch((err) => {
        if (err?.name === 'AbortError') {
          return;
        }
        if (!preloadAbortRef.current) {
          // Silently ignore other errors
        }
      });
    });

    return () => {
      preloadAbortRef.current = true;
    };
  }, [currentImage, albumContext, signal]);
}
