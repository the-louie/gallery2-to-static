/**
 * ImageGrid Component
 *
 * A responsive grid component that displays image thumbnails with loading states,
 * empty states, and full accessibility support. Integrates with useAlbumData hook.
 *
 * @module frontend/src/components/ImageGrid
 */

import React, { useMemo, useCallback } from 'react';
import { useAlbumData } from '@/hooks/useAlbumData';
import type { ImageGridProps, Image } from '@/types';
import { isImage } from '@/types';
import { ImageThumbnail } from '@/components/ImageThumbnail';
import { ImageGridSkeleton } from './ImageGridSkeleton';
import { ImageGridEmpty } from './ImageGridEmpty';
import './ImageGrid.css';

/**
 * ImageGrid component
 *
 * Displays images in a responsive grid layout with loading, error, and empty states.
 * Filters Child[] data to show only images (GalleryPhotoItem type).
 * Can work with provided images prop or load data using albumId.
 *
 * @param props - Component props
 * @returns React component
 */
export function ImageGrid({
  images: imagesProp,
  isLoading: isLoadingProp,
  onImageClick,
  className,
  viewMode = 'grid',
  albumId,
}: Omit<ImageGridProps, 'images'> & {
  images?: ImageGridProps['images'];
  albumId?: number | null;
}) {
  // Use hook if albumId is provided, otherwise use props
  const { data, isLoading: isLoadingHook, error, refetch } = useAlbumData(
    albumId ?? null,
  );

  // Combine loading states: show loading if either prop or hook indicates loading
  // If isLoadingProp is explicitly provided, it takes precedence; otherwise use hook's state
  const isLoading = isLoadingProp !== undefined ? isLoadingProp : isLoadingHook;

  // Filter images from data or use provided images prop
  const images = useMemo(() => {
    // If imagesProp is explicitly provided (even if empty array), use it
    if (imagesProp !== undefined) {
      return imagesProp;
    }
    // Otherwise, use data from hook
    if (!data) {
      return [];
    }
    return data.filter(isImage);
  }, [imagesProp, data]);

  const handleImageClick = useCallback(
    (image: Image) => {
      if (onImageClick) {
        onImageClick(image);
      }
    },
    [onImageClick],
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Loading state
  if (isLoading) {
    return <ImageGridSkeleton className={className} />;
  }

  // Error state
  if (error) {
    return (
      <div className={className ? `image-grid-error ${className}` : 'image-grid-error'}>
        <p>Error loading images: {error.message}</p>
        <button onClick={handleRetry} aria-label="Retry loading images">
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (images.length === 0) {
    return <ImageGridEmpty className={className} />;
  }

  // Grid with images
  return (
    <div
      className={className ? `image-grid image-grid-${viewMode} ${className}` : `image-grid image-grid-${viewMode}`}
      role="region"
      aria-label="Image grid"
    >
      {images.map((image) => (
        <ImageThumbnail
          key={image.id}
          image={image}
          useThumbnail={true}
          onClick={handleImageClick}
        />
      ))}
    </div>
  );
}

export default ImageGrid;
