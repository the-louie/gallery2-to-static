/**
 * React hook for image navigation within an album
 *
 * Provides functions to navigate to next/previous images in an album.
 * Handles edge cases like first/last image and single image scenarios.
 *
 * ## Features
 *
 * - Get next image in album
 * - Get previous image in album
 * - Handle edge cases (first image, last image, single image)
 * - Works with album context (array of images)
 *
 * ## Usage
 *
 * ```tsx
 * function Lightbox({ images, currentImageId }: Props) {
 *   const { getNextImage, getPreviousImage, hasNext, hasPrevious } =
 *     useImageNavigation(images, currentImageId);
 *
 *   return (
 *     <div>
 *       <button disabled={!hasPrevious} onClick={() => navigateToPrevious()}>
 *         Previous
 *       </button>
 *       <button disabled={!hasNext} onClick={() => navigateToNext()}>
 *         Next
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @module frontend/src/hooks/useImageNavigation
 */

import { useMemo } from 'react';
import type { Image } from '@/types';

/**
 * Return type for useImageNavigation hook
 */
export interface UseImageNavigationReturn {
  /** Get the next image in the album, or null if at the last image */
  getNextImage: () => Image | null;
  /** Get the previous image in the album, or null if at the first image */
  getPreviousImage: () => Image | null;
  /** Whether there is a next image available */
  hasNext: boolean;
  /** Whether there is a previous image available */
  hasPrevious: boolean;
  /** Current image index in the album (0-based), or -1 if not found */
  currentIndex: number;
  /** Total number of images in the album */
  totalImages: number;
}

/**
 * Hook to navigate between images in an album
 *
 * @param images - Array of images in the album
 * @param currentImageId - ID of the currently displayed image
 * @returns Object with navigation functions and state
 *
 * @example
 * ```tsx
 * const { getNextImage, getPreviousImage, hasNext, hasPrevious } =
 *   useImageNavigation(images, currentImageId);
 *
 * const nextImage = getNextImage(); // Returns next image or null
 * const previousImage = getPreviousImage(); // Returns previous image or null
 * ```
 */
export function useImageNavigation(
  images: Image[],
  currentImageId: number | null,
): UseImageNavigationReturn {
  // Find current image index
  const currentIndex = useMemo(() => {
    if (currentImageId === null || images.length === 0) {
      return -1;
    }
    return images.findIndex((img) => img.id === currentImageId);
  }, [images, currentImageId]);

  // Check if there is a next/previous image
  const hasNext = useMemo(() => {
    return currentIndex >= 0 && currentIndex < images.length - 1;
  }, [currentIndex, images.length]);

  const hasPrevious = useMemo(() => {
    return currentIndex > 0 && currentIndex < images.length;
  }, [currentIndex, images.length]);

  // Get next image function
  const getNextImage = useMemo(() => {
    return (): Image | null => {
      if (!hasNext || currentIndex < 0) {
        return null;
      }
      const nextIndex = currentIndex + 1;
      if (nextIndex >= 0 && nextIndex < images.length) {
        return images[nextIndex];
      }
      return null;
    };
  }, [hasNext, currentIndex, images]);

  // Get previous image function
  const getPreviousImage = useMemo(() => {
    return (): Image | null => {
      if (!hasPrevious || currentIndex < 0) {
        return null;
      }
      const previousIndex = currentIndex - 1;
      if (previousIndex >= 0 && previousIndex < images.length) {
        return images[previousIndex];
      }
      return null;
    };
  }, [hasPrevious, currentIndex, images]);

  return {
    getNextImage,
    getPreviousImage,
    hasNext,
    hasPrevious,
    currentIndex,
    totalImages: images.length,
  };
}
