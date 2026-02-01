/**
 * React hook for managing lightbox state with URL synchronization
 *
 * Manages lightbox open/close state and current image, synchronized with URL.
 * Provides functions to open/close lightbox and navigate between images.
 * Handles direct URL access by automatically opening lightbox when route matches.
 *
 * ## Features
 *
 * - URL-synchronized lightbox state
 * - Open/close lightbox functions
 * - Navigate to next/previous image
 * - Direct URL access support
 * - Browser back/forward support
 * - Album context management
 *
 * ## Usage
 *
 * ```tsx
 * function ImageDetailPage() {
 *   const { isOpen, image, openLightbox, closeLightbox, navigateToNext, navigateToPrevious } =
 *     useLightbox();
 *
 *   return (
 *     <Lightbox
 *       isOpen={isOpen}
 *       image={image}
 *       onClose={closeLightbox}
 *       onNext={navigateToNext}
 *       onPrevious={navigateToPrevious}
 *     />
 *   );
 * }
 * ```
 *
 * @module frontend/src/hooks/useLightbox
 */

import { useEffect, useMemo, useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { parseAlbumImageParams, parseImageId } from '@/utils/routeParams';
import type { RouteParams } from '@/types';
import type { Image } from '@/types';

/**
 * Return type for useLightbox hook
 */
export interface UseLightboxReturn {
  /** Whether the lightbox is currently open */
  isOpen: boolean;
  /** Currently displayed image, or null if no image */
  image: Image | null;
  /** Album ID context, or null if not available */
  albumId: number | null;
  /** Array of images in the album context, empty if not available */
  images: Image[];
  /** Function to open lightbox with image and album context */
  openLightbox: (image: Image, albumId: number, images: Image[]) => void;
  /** Function to close lightbox and navigate back to album */
  closeLightbox: () => void;
  /** Function to navigate to next image (updates URL) */
  navigateToNext: () => void;
  /** Function to navigate to previous image (updates URL) */
  navigateToPrevious: () => void;
}

/**
 * Hook to manage lightbox state synchronized with URL
 *
 * The hook automatically detects URL changes and updates lightbox state accordingly.
 * When the URL matches an image route (`/album/:albumId/image/:imageId` or `/image/:id`),
 * the lightbox is automatically opened with the corresponding image.
 *
 * @param images - Optional array of images for album context (can be provided later via openLightbox)
 * @param albumPath - Optional path-based album URL (e.g. /albums/photos); when provided, navigation uses path-based URLs
 * @returns Object with lightbox state and control functions
 *
 * @example
 * ```tsx
 * const { isOpen, image, openLightbox, closeLightbox } = useLightbox();
 *
 * // Open lightbox programmatically
 * openLightbox(currentImage, albumId, albumImages);
 *
 * // Close lightbox (navigates back to album)
 * closeLightbox();
 * ```
 */
export function useLightbox(
  images: Image[] = [],
  albumPath?: string | null,
  resolvedAlbumId?: number | null,
  resolvedImageId?: number | null,
): UseLightboxReturn {
  const navigate = useNavigate();
  const params = useParams<RouteParams>();

  const pathBase =
    albumPath != null && albumPath !== ''
      ? albumPath.replace(/\/+$/, '')
      : null;

  // State for current image and album context
  const [currentImage, setCurrentImage] = useState<Image | null>(null);
  const [albumId, setAlbumId] = useState<number | null>(null);
  const [albumImages, setAlbumImages] = useState<Image[]>(images);
  const [resolvedAlbumPath, setResolvedAlbumPath] = useState<string | null>(pathBase ?? null);

  useEffect(() => {
    setResolvedAlbumPath(pathBase ?? null);
  }, [pathBase]);

  // Update album images when prop changes
  useEffect(() => {
    setAlbumImages(images);
  }, [images]);

  const routeParams = useMemo(() => {
    if (resolvedAlbumId != null && resolvedImageId != null) {
      return { albumId: resolvedAlbumId, imageId: resolvedImageId };
    }
    if (params.albumId && params.imageId) {
      return parseAlbumImageParams(params.albumId, params.imageId);
    }
    if (params.id) {
      return { albumId: null, imageId: parseImageId(params.id) };
    }
    return { albumId: null, imageId: null };
  }, [resolvedAlbumId, resolvedImageId, params.albumId, params.imageId, params.id]);

  // Determine if lightbox should be open based on URL
  const isOpen = useMemo(() => {
    return routeParams.imageId !== null;
  }, [routeParams.imageId]);

  // Update image when route changes or album images load (for URL-based navigation)
  useEffect(() => {
    if (routeParams.imageId !== null) {
      if (albumImages.length > 0) {
        const foundImage = albumImages.find((img) => img.id === routeParams.imageId);
        if (foundImage) {
          setCurrentImage(foundImage);
        } else {
          // Image not found in album (might be loading or invalid)
          setCurrentImage(null);
        }
      } else {
        // Images not loaded yet, wait for them
        setCurrentImage(null);
      }
    } else if (routeParams.imageId === null) {
      // URL doesn't contain image route, close lightbox
      setCurrentImage(null);
    }
  }, [routeParams.imageId, albumImages]);

  // Update album ID when route changes
  useEffect(() => {
    if (routeParams.albumId !== null) {
      setAlbumId(routeParams.albumId);
    } else if (routeParams.imageId === null) {
      // No image route, reset album ID
      setAlbumId(null);
    }
  }, [routeParams.albumId, routeParams.imageId]);

  const pathForImage = useCallback(
    (imageId: number) => {
      if (resolvedAlbumPath !== null) {
        return resolvedAlbumPath ? `${resolvedAlbumPath}/image/${imageId}` : `/image/${imageId}`;
      }
      if (albumId !== null) return `/album/${albumId}/image/${imageId}`;
      return `/image/${imageId}`;
    },
    [resolvedAlbumPath, albumId],
  );

  const pathForAlbum = useCallback(() => {
    if (resolvedAlbumPath !== null) return resolvedAlbumPath || '/';
    if (albumId !== null) return `/album/${albumId}`;
    return '/';
  }, [resolvedAlbumPath, albumId]);

  // Function to open lightbox with image and album context
  const openLightbox = useCallback(
    (image: Image, albumIdParam: number, imagesParam: Image[]) => {
      setCurrentImage(image);
      setAlbumId(albumIdParam);
      setAlbumImages(imagesParam);
      navigate(pathForImage(image.id), { replace: false });
    },
    [navigate, pathForImage],
  );

  // Function to close lightbox
  const closeLightbox = useCallback(() => {
    navigate(pathForAlbum(), { replace: false });
    setCurrentImage(null);
    setAlbumId(null);
    setAlbumImages([]);
  }, [navigate, pathForAlbum]);

  // Function to navigate to next image
  const navigateToNext = useCallback(() => {
    if (currentImage === null || albumImages.length === 0) return;
    const currentIndex = albumImages.findIndex((img) => img.id === currentImage.id);
    if (currentIndex >= 0 && currentIndex < albumImages.length - 1) {
      const nextImage = albumImages[currentIndex + 1];
      navigate(pathForImage(nextImage.id), { replace: true });
    }
  }, [currentImage, albumImages, navigate, pathForImage]);

  // Function to navigate to previous image
  const navigateToPrevious = useCallback(() => {
    if (currentImage === null || albumImages.length === 0) return;
    const currentIndex = albumImages.findIndex((img) => img.id === currentImage.id);
    if (currentIndex > 0) {
      const previousImage = albumImages[currentIndex - 1];
      navigate(pathForImage(previousImage.id), { replace: true });
    }
  }, [currentImage, albumImages, navigate, pathForImage]);

  return {
    isOpen,
    image: currentImage,
    albumId,
    images: albumImages,
    openLightbox,
    closeLightbox,
    navigateToNext,
    navigateToPrevious,
  };
}
