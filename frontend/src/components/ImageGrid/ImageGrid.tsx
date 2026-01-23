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
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAlbumData } from '@/hooks/useAlbumData';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { useSort } from '@/hooks/useSort';
import { useFilter } from '@/contexts/FilterContext';
import { useViewMode } from '@/contexts/ViewModeContext';
import { applyFilters } from '@/utils/filterUtils';
import { sortItems } from '@/utils/sorting';
import type { ImageGridProps, Image, Child, SortOption } from '@/types';
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
  viewMode: viewModeProp,
  albumId,
  sortOption: sortOptionProp,
}: Omit<ImageGridProps, 'images'> & {
  images?: ImageGridProps['images'];
  albumId?: number | null;
  sortOption?: SortOption;
}) {
  // Use hook if albumId is provided, otherwise use props
  const { data, isLoading: isLoadingHook, error, refetch } = useAlbumData(
    albumId ?? null,
  );

  // Get filter criteria from context
  const { criteria } = useFilter();

  // Get view mode from context or use prop if provided (prop takes precedence)
  const { imageViewMode } = useViewMode();
  const finalViewMode = viewModeProp ?? imageViewMode;

  // Get sort option from hook or use prop if provided
  const { option: sortOptionFromHook } = useSort('images');
  const sortOption = sortOptionProp ?? sortOptionFromHook;

  // Combine loading states: show loading if either prop or hook indicates loading
  // If isLoadingProp is explicitly provided, it takes precedence; otherwise use hook's state
  const isLoading = isLoadingProp !== undefined ? isLoadingProp : isLoadingHook;

  // Filter images from data or use provided images prop, then apply filters and sorting
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
    // Skip filtering if imagesProp is provided (parent has already filtered)
    let filtered = allImages;
    if (allImages.length > 0 && imagesProp === undefined) {
      const filteredItems = applyFilters(allImages as Child[], criteria);
      filtered = filteredItems.filter(isImage) as Image[];
    }

    // Apply sorting
    if (filtered.length > 0 && sortOption) {
      return sortItems(filtered, sortOption);
    }

    return filtered;
  }, [imagesProp, data, criteria, sortOption]);

  // Scroll position management (save only, no restoration)
  const { saveScrollPosition } = useScrollPosition(albumId ?? null, 'image-grid');

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
        viewMode={finalViewMode}
      />
    ),
    [handleImageClick, finalViewMode],
  );

  // Loading state
  if (isLoading) {
    return (
      <ErrorBoundary>
        <ImageGridSkeleton className={className} />
      </ErrorBoundary>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorBoundary>
        <div
          className={className ? `image-grid-error ${className}` : 'image-grid-error'}
          role="alert"
          aria-live="assertive"
        >
          <p>Error loading images: {error.message}</p>
          <button type="button" onClick={handleRetry} aria-label="Retry loading images">
            Retry
          </button>
        </div>
      </ErrorBoundary>
    );
  }

  // Empty state
  if (images.length === 0) {
    return (
      <ErrorBoundary>
        <ImageGridEmpty className={className} />
      </ErrorBoundary>
    );
  }

  // Grid with images using virtual scrolling
  return (
    <ErrorBoundary>
      <VirtualGrid
        items={images}
        renderItem={renderImage}
        viewMode={finalViewMode}
        className={className ? `image-grid ${className}` : 'image-grid'}
        role="region"
        aria-label="Image grid"
        onScroll={saveScrollPosition}
      />
    </ErrorBoundary>
  );
}

export default ImageGrid;
