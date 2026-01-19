/**
 * AlbumGrid Component
 *
 * A responsive grid component that displays album thumbnails with loading states,
 * empty states, and full accessibility support. Integrates with useAlbumData hook.
 *
 * @module frontend/src/components/AlbumGrid
 */

import React, { useMemo, useCallback } from 'react';
import { useAlbumData } from '@/hooks/useAlbumData';
import type { AlbumGridProps, Album } from '@/types';
import { isAlbum } from '@/types';
import { AlbumCard } from './AlbumCard';
import { AlbumGridSkeleton } from './AlbumGridSkeleton';
import { AlbumGridEmpty } from './AlbumGridEmpty';
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
}: Omit<AlbumGridProps, 'albums'> & {
  albums?: AlbumGridProps['albums'];
  albumId?: number | null;
}) {
  // Use hook if albumId is provided, otherwise use props
  const { data, isLoading: isLoadingHook, error, refetch } = useAlbumData(
    albumId ?? null,
  );

  // Combine loading states: show loading if either prop or hook indicates loading
  // If isLoadingProp is explicitly provided, it takes precedence; otherwise use hook's state
  const isLoading = isLoadingProp !== undefined ? isLoadingProp : isLoadingHook;

  // Filter albums from data or use provided albums prop
  const albums = useMemo(() => {
    // If albumsProp is explicitly provided (even if empty array), use it
    if (albumsProp !== undefined) {
      return albumsProp;
    }
    // Otherwise, use data from hook
    if (!data) {
      return [];
    }
    return data.filter(isAlbum);
  }, [albumsProp, data]);

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

  // Grid with albums
  return (
    <div
      className={className ? `album-grid album-grid-${viewMode} ${className}` : `album-grid album-grid-${viewMode}`}
      role="region"
      aria-label="Album grid"
    >
      {albums.map((album) => (
        <AlbumCard
          key={album.id}
          album={album}
          onClick={handleAlbumClick}
        />
      ))}
    </div>
  );
}

export default AlbumGrid;
