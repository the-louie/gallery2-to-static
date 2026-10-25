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

import { useMemo, useCallback, useState } from 'react';
import { getPhotoSlug } from '@/utils/albumPath';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { isFromAlbumState } from '@/utils/albumScroll';
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
  const location = useLocation();
  const params = useParams<RouteParams>();

  const pathBase =
    albumPath != null && albumPath !== ''
      ? albumPath.replace(/\/+$/, '')
      : null;

  // State for current image and album context
  const [currentImage, setCurrentImage] = useState<Image | null>(null);
  const [albumId, setAlbumId] = useState<number | null>(null);
  const [albumImages, setAlbumImages] = useState<Image[]>(images);
  const resolvedAlbumPath = pathBase ?? null;

  // Prop and route changes are synced during render, not in effects one render late (REFAC-01).
  // openLightbox/closeLightbox still set this state directly.
  // Update album images when the prop changes
  const [syncedImages, setSyncedImages] = useState(images);
  let albumImagesNow = albumImages;
  if (syncedImages !== images) {
    setSyncedImages(images);
    setAlbumImages(images);
    albumImagesNow = images;
  }

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

  // Update image when the route changes or album images load (URL-based navigation): the image
  // with the route's id, or null (no image route, images not loaded yet, or id not in the album)
  const [syncedImageRoute, setSyncedImageRoute] = useState<{ imageId: number | null; images: Image[] } | null>(null);
  if (syncedImageRoute === null || syncedImageRoute.imageId !== routeParams.imageId || syncedImageRoute.images !== albumImagesNow) {
    setSyncedImageRoute({ imageId: routeParams.imageId, images: albumImagesNow });
    setCurrentImage(
      routeParams.imageId === null ? null : (albumImagesNow.find((img) => img.id === routeParams.imageId) ?? null),
    );
  }

  // Update album ID when the route changes; without an image route it is reset
  const [syncedAlbumRoute, setSyncedAlbumRoute] = useState<{ albumId: number | null; imageId: number | null } | null>(null);
  if (syncedAlbumRoute === null || syncedAlbumRoute.albumId !== routeParams.albumId || syncedAlbumRoute.imageId !== routeParams.imageId) {
    setSyncedAlbumRoute({ albumId: routeParams.albumId, imageId: routeParams.imageId });
    if (routeParams.albumId !== null) {
      setAlbumId(routeParams.albumId);
    } else if (routeParams.imageId === null) {
      setAlbumId(null);
    }
  }

  const pathForImage = useCallback(
    (imageId: number) => {
      if (resolvedAlbumPath !== null) {
        // Path-based album: the photo's slug (URL-01); the id form only if the photo is unknown
        const image = albumImages.find((img) => img.id === imageId);
        if (image) return `${resolvedAlbumPath}/${getPhotoSlug(image)}`;
        return resolvedAlbumPath ? `${resolvedAlbumPath}/image/${imageId}` : `/image/${imageId}`;
      }
      if (albumId !== null) return `/album/${albumId}/image/${imageId}`;
      return `/image/${imageId}`;
    },
    [resolvedAlbumPath, albumId, albumImages],
  );

  const pathForAlbum = useCallback(() => {
    if (resolvedAlbumPath !== null) return `${resolvedAlbumPath}/`;
    if (albumId !== null) return `/album/${albumId}`;
    return '/';
  }, [resolvedAlbumPath, albumId]);

  // Function to open lightbox with image and album context
  const openLightbox = useCallback(
    (image: Image, albumIdParam: number, imagesParam: Image[]) => {
      setCurrentImage(image);
      setAlbumId(albumIdParam);
      setAlbumImages(imagesParam);
      navigate(pathForImage(image.id), { replace: false, state: { fromAlbum: true } });
    },
    [navigate, pathForImage],
  );

  // Function to close lightbox
  // Opened from the album (state.fromAlbum, kept through next/previous): go Back, so the history
  // is [album] again and the album restores its scroll position. Opened from a link or deep link:
  // replace the image entry with the album (LOGIC-17).
  const closeLightbox = useCallback(() => {
    if (isFromAlbumState(location.state)) {
      navigate(-1);
    } else {
      navigate(pathForAlbum(), { replace: true });
    }
    setCurrentImage(null);
    setAlbumId(null);
    setAlbumImages([]);
  }, [navigate, pathForAlbum, location.state]);

  // Function to navigate to next image
  const navigateToNext = useCallback(() => {
    if (currentImage === null || albumImages.length === 0) return;
    const currentIndex = albumImages.findIndex((img) => img.id === currentImage.id);
    if (currentIndex >= 0 && currentIndex < albumImages.length - 1) {
      const nextImage = albumImages[currentIndex + 1];
      navigate(pathForImage(nextImage.id), { replace: true, state: location.state });
    }
  }, [currentImage, albumImages, navigate, pathForImage, location.state]);

  // Function to navigate to previous image
  const navigateToPrevious = useCallback(() => {
    if (currentImage === null || albumImages.length === 0) return;
    const currentIndex = albumImages.findIndex((img) => img.id === currentImage.id);
    if (currentIndex > 0) {
      const previousImage = albumImages[currentIndex - 1];
      navigate(pathForImage(previousImage.id), { replace: true, state: location.state });
    }
  }, [currentImage, albumImages, navigate, pathForImage, location.state]);

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
