/**
 * React hook for preloading adjacent images in an album
 *
 * Automatically preloads the next and previous images when the current image changes.
 * This provides smooth navigation by ensuring adjacent images are already cached.
 *
 * ## Features
 *
 * - Preloads next and previous images only (bounded; no unbounded preload queue)
 * - Handles edge cases (first/last image)
 * - Cleans up on unmount or image change
 * - Error handling for failed preloads
 * - Image cache may be cleared on navigation (see Layout); returning to an album may re-load images
 *
 * ## Usage
 *
 * ```tsx
 * function Lightbox({ image, albumContext }: Props) {
 *   useImagePreload(image, albumContext);
 *
 *   return <div>...</div>;
 * }
 * ```
 *
 * @module frontend/src/hooks/useImagePreload
 */

import { useEffect, useRef } from 'react';
import type { Image } from '@/types';
import { getImageUrl } from '@/utils/imageUrl';
import { preloadImage } from '@/utils/imagePreload';

/**
 * Hook to preload adjacent images in an album
 *
 * Preloads the next and previous images when the current image changes.
 * Silently handles errors to avoid disrupting the user experience.
 *
 * @param currentImage - Currently displayed image
 * @param albumContext - Array of all images in the album
 *
 * @example
 * ```tsx
 * const { image, images } = useLightbox();
 * useImagePreload(image, images);
 * ```
 */
export function useImagePreload(
  currentImage: Image | null,
  albumContext: Image[],
): void {
  const preloadAbortRef = useRef<boolean>(false);

  useEffect(() => {
    // Reset abort flag
    preloadAbortRef.current = false;

    // Don't preload if no current image or insufficient context
    if (!currentImage || albumContext.length <= 1) {
      return;
    }

    // Find current image index
    const currentIndex = albumContext.findIndex(
      (img) => img.id === currentImage.id,
    );

    if (currentIndex === -1) {
      return;
    }

    // Determine which images to preload
    const imagesToPreload: Image[] = [];

    // Preload next image if available
    if (currentIndex < albumContext.length - 1) {
      imagesToPreload.push(albumContext[currentIndex + 1]);
    }

    // Preload previous image if available
    if (currentIndex > 0) {
      imagesToPreload.push(albumContext[currentIndex - 1]);
    }

    // Preload images (fire and forget - errors are handled silently)
    imagesToPreload.forEach((image) => {
      const imageUrl = getImageUrl(image, false);
      preloadImage(imageUrl).catch(() => {
        // Silently handle preload errors - don't disrupt user experience
        // Errors are expected for missing images or network issues
        // Only process error if component is still mounted
        if (!preloadAbortRef.current) {
          // Component still mounted, but we silently ignore errors
          // In production, you might want to log to a service
        }
      });
    });

    // Cleanup function
    return () => {
      preloadAbortRef.current = true;
      // Note: We can't cancel Image loading, but we can prevent error handling
      // from running if the component unmounts
    };
  }, [currentImage, albumContext]);
}
