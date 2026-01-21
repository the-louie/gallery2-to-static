/**
 * AlbumGrid Component
 *
 * A responsive grid component that displays album thumbnails with loading states,
 * empty states, and full accessibility support. Integrates with useAlbumData hook.
 * Uses virtual scrolling for efficient rendering of large datasets.
 *
 * @module frontend/src/components/AlbumGrid
 */

import React, { useMemo, useCallback } from 'react';
import { useAlbumData } from '@/hooks/useAlbumData';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { useSort } from '@/hooks/useSort';
import { useFilter } from '@/contexts/FilterContext';
import { applyFilters } from '@/utils/filterUtils';
import { sortItems } from '@/utils/sorting';
import type { AlbumGridProps, Album, Child, SortOption } from '@/types';
import { isAlbum } from '@/types';
import { AlbumCard } from './AlbumCard';
import { AlbumGridSkeleton } from './AlbumGridSkeleton';
import { AlbumGridEmpty } from './AlbumGridEmpty';
import { VirtualGrid } from '@/components/VirtualGrid';
import './AlbumGrid.css';

/**
 * AlbumGrid component
 *
 * Displays albums in a responsive grid layout with loading, error, and empty states.
 * Filters Child[] data to show only albums (GalleryAlbumItem type).
 * Can work with provided albums prop or load data using albumId.
 *
 * @param props - Component props
 * @returns React component
 */
export function AlbumGrid({
  albums: albumsProp,
  isLoading: isLoadingProp,
  onAlbumClick,
  className,
  viewMode = 'grid',
  albumId,
  sortOption: sortOptionProp,
}: Omit<AlbumGridProps, 'albums'> & {
  albums?: AlbumGridProps['albums'];
  albumId?: number | null;
  sortOption?: SortOption;
}) {
  // Use hook if albumId is provided, otherwise use props
  const { data, isLoading: isLoadingHook, error, refetch } = useAlbumData(
    albumId ?? null,
  );

  // Get filter criteria from context
  const { criteria } = useFilter();

  // Get sort option from hook or use prop if provided
  const { option: sortOptionFromHook } = useSort('albums');
  const sortOption = sortOptionProp ?? sortOptionFromHook;

  // Combine loading states: show loading if either prop or hook indicates loading
  // If isLoadingProp is explicitly provided, it takes precedence; otherwise use hook's state
  const isLoading = isLoadingProp !== undefined ? isLoadingProp : isLoadingHook;

  // Filter albums from data or use provided albums prop, then apply filters and sorting
  const albums = useMemo(() => {
    let allAlbums: Album[] = [];

    // If albumsProp is explicitly provided (even if empty array), use it
    if (albumsProp !== undefined) {
      allAlbums = albumsProp;
    } else if (data) {
      // Otherwise, use data from hook
      allAlbums = data.filter(isAlbum);
    }

    // Apply filters if any are active
    // Skip filtering if albumsProp is provided (parent has already filtered)
    let filtered = allAlbums;
    if (allAlbums.length > 0 && albumsProp === undefined) {
      const filteredItems = applyFilters(allAlbums as Child[], criteria);
      filtered = filteredItems.filter(isAlbum) as Album[];
    }

    // Apply sorting
    if (filtered.length > 0 && sortOption) {
      return sortItems(filtered, sortOption);
    }

    return filtered;
  }, [albumsProp, data, criteria, sortOption]);

  // Scroll position management
  const { scrollTop, saveScrollPosition } = useScrollPosition(albumId ?? null, 'album-grid');

  const handleAlbumClick = useCallback(
    (album: Album) => {
      if (onAlbumClick) {
        onAlbumClick(album);
      }
    },
    [onAlbumClick],
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Render function for virtual grid
  const renderAlbum = useCallback(
    (album: Album, index: number) => (
      <AlbumCard key={album.id} album={album} onClick={handleAlbumClick} />
    ),
    [handleAlbumClick],
  );

  // Loading state
  if (isLoading) {
    return <AlbumGridSkeleton className={className} />;
  }

  // Error state
  if (error) {
    return (
      <div className={className ? `album-grid-error ${className}` : 'album-grid-error'}>
        <p>Error loading albums: {error.message}</p>
        <button onClick={handleRetry} aria-label="Retry loading albums">
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (albums.length === 0) {
    return <AlbumGridEmpty className={className} />;
  }

  // Grid with albums using virtual scrolling
  return (
    <VirtualGrid
      items={albums}
      renderItem={renderAlbum}
      viewMode={viewMode}
      className={className ? `album-grid ${className}` : 'album-grid'}
      role="region"
      aria-label="Album grid"
      onScroll={saveScrollPosition}
      initialScrollTop={scrollTop}
    />
  );
}

export default AlbumGrid;
