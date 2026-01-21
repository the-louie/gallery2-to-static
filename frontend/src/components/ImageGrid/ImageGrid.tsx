/**
 * ImageGrid Component
 *
 * A responsive grid component that displays image thumbnails with loading states,
 * empty states, and full accessibility support. Integrates with useAlbumData hook.
 * Uses virtual scrolling for efficient rendering of large datasets.
 *
 * @module frontend/src/components/ImageGrid
 */

import React, { useMemo, useCallback } from 'react';
import { useAlbumData } from '@/hooks/useAlbumData';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { useFilter } from '@/contexts/FilterContext';
import { applyFilters } from '@/utils/filterUtils';
import type { ImageGridProps, Image, Child } from '@/types';
import { isImage } from '@/types';
import { ImageThumbnail } from '@/components/ImageThumbnail';
import { ImageGridSkeleton } from './ImageGridSkeleton';
import { ImageGridEmpty } from './ImageGridEmpty';
import { VirtualGrid } from '@/components/VirtualGrid';
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

  // Get filter criteria from context
  const { criteria } = useFilter();

  // Combine loading states: show loading if either prop or hook indicates loading
  // If isLoadingProp is explicitly provided, it takes precedence; otherwise use hook's state
  const isLoading = isLoadingProp !== undefined ? isLoadingProp : isLoadingHook;

  // Filter images from data or use provided images prop, then apply filters
  const images = useMemo(() => {
    let allImages: Image[] = [];
    
    // If imagesProp is explicitly provided (even if empty array), use it
    if (imagesProp !== undefined) {
      allImages = imagesProp;
    } else if (data) {
      // Otherwise, use data from hook
      allImages = data.filter(isImage);
    }

    // Apply filters if any are active
    if (allImages.length > 0) {
      const filtered = applyFilters(allImages as Child[], criteria);
      return filtered.filter(isImage) as Image[];
    }

    return allImages;
  }, [imagesProp, data, criteria]);

  // Scroll position management
  const { scrollTop, saveScrollPosition } = useScrollPosition(albumId ?? null, 'image-grid');

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

  // Render function for virtual grid
  const renderImage = useCallback(
    (image: Image, index: number) => (
      <ImageThumbnail
        key={image.id}
        image={image}
        useThumbnail={true}
        onClick={handleImageClick}
      />
    ),
    [handleImageClick],
  );

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

  // Grid with images using virtual scrolling
  return (
    <VirtualGrid
      items={images}
      renderItem={renderImage}
      viewMode={viewMode}
      className={className ? `image-grid ${className}` : 'image-grid'}
      role="region"
      aria-label="Image grid"
      onScroll={saveScrollPosition}
      initialScrollTop={scrollTop}
    />
  );
}

export default ImageGrid;
