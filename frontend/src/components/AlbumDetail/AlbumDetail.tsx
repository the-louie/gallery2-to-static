/**
 * AlbumDetail Component
 *
 * A reusable component that displays album details, including album metadata
 * (title, description), child albums, and child images. Handles navigation,
 * empty states, and integrates with React Router.
 *
 * @module frontend/src/components/AlbumDetail
 */

import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAlbumData } from '@/hooks/useAlbumData';
import { useSort } from '@/hooks/useSort';
import { useFilter } from '@/contexts/FilterContext';
import { useViewMode } from '@/contexts/ViewModeContext';
import { applyFilters } from '@/utils/filterUtils';
import { AlbumGrid } from '@/components/AlbumGrid';
import { ImageGrid } from '@/components/ImageGrid';
import { SortDropdown } from '@/components/SortDropdown';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { AlbumDetailEmpty } from './AlbumDetailEmpty';
import type { Album, Image, Child } from '@/types';
import { isAlbum, isImage } from '@/types';
import './AlbumDetail.css';

/**
 * Props for the AlbumDetail component
 */
export interface AlbumDetailProps {
  /** ID of the album to display (required) */
  albumId: number;
  /** Album metadata if available (optional - for when parent context is available) */
  album?: Album;
  /** Handler for child album clicks */
  onAlbumClick?: (album: Album) => void;
  /** Handler for image clicks */
  onImageClick?: (image: Image) => void;
  /** Handler for back button clicks */
  onBackClick?: () => void;
  /** Optional CSS class name */
  className?: string;
  /** Whether to show the back button (default: true) */
  showBackButton?: boolean;
  /** Whether to show the album title (default: true) */
  showTitle?: boolean;
  /** Whether to show the album description (default: true) */
  showDescription?: boolean;
  /** Optional breadcrumb component (for future integration) */
  breadcrumbs?: React.ReactNode;
}

/**
 * AlbumDetail component
 *
 * Displays album information, child albums, and child images with navigation support.
 * Can work with or without album metadata prop - if not provided, metadata is optional.
 *
 * @param props - Component props
 * @returns React component
 */
export function AlbumDetail({
  albumId,
  album: albumProp,
  onAlbumClick,
  onImageClick,
  onBackClick,
  className,
  showBackButton = true,
  showTitle = true,
  showDescription = true,
  breadcrumbs,
}: AlbumDetailProps) {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useAlbumData(albumId);

  // Get filter criteria from context
  const { criteria } = useFilter();

  // Get sort preferences for albums and images
  const albumsSort = useSort('albums');
  const imagesSort = useSort('images');

  // Get view mode preferences from context
  const { albumViewMode, imageViewMode } = useViewMode();

  // Use album prop if provided, otherwise null (metadata is optional)
  const album = albumProp || null;

  // Separate albums and images from the data, then apply filters
  const albums = useMemo<Album[]>(() => {
    if (!data) {
      return [];
    }
    const allAlbums = data.filter(isAlbum);
    // Apply filters if any are active
    if (allAlbums.length > 0) {
      const filtered = applyFilters(allAlbums as Child[], criteria);
      return filtered.filter(isAlbum) as Album[];
    }
    return allAlbums;
  }, [data, criteria]);

  const images = useMemo<Image[]>(() => {
    if (!data) {
      return [];
    }
    const allImages = data.filter(isImage);
    // Apply filters if any are active
    if (allImages.length > 0) {
      const filtered = applyFilters(allImages as Child[], criteria);
      return filtered.filter(isImage) as Image[];
    }
    return allImages;
  }, [data, criteria]);

  // Default navigation handlers
  const handleAlbumClick = useCallback(
    (clickedAlbum: Album) => {
      if (onAlbumClick) {
        onAlbumClick(clickedAlbum);
      } else {
        navigate(`/album/${clickedAlbum.id}`);
      }
    },
    [onAlbumClick, navigate],
  );

  const handleImageClick = useCallback(
    (clickedImage: Image) => {
      if (onImageClick) {
        onImageClick(clickedImage);
      } else {
        // Navigate to hierarchical route: /album/:albumId/image/:imageId
        navigate(`/album/${albumId}/image/${clickedImage.id}`);
      }
    },
    [onImageClick, navigate, albumId],
  );

  const handleBackClick = useCallback(() => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  }, [onBackClick, navigate]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={
          className
            ? `album-detail album-detail-loading ${className}`
            : 'album-detail album-detail-loading'
        }
      >
        {showBackButton && (
          <button
            className="album-detail-back"
            onClick={handleBackClick}
            aria-label="Go back"
          >
            ← Back
          </button>
        )}
        {breadcrumbs && (
          <div className="album-detail-breadcrumbs">{breadcrumbs}</div>
        )}
        <AlbumGrid isLoading={true} />
        <ImageGrid isLoading={true} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={
          className
            ? `album-detail album-detail-error ${className}`
            : 'album-detail album-detail-error'
        }
      >
        {showBackButton && (
          <button
            className="album-detail-back"
            onClick={handleBackClick}
            aria-label="Go back"
          >
            ← Back
          </button>
        )}
        {breadcrumbs && (
          <div className="album-detail-breadcrumbs">{breadcrumbs}</div>
        )}
        <div className="album-detail-error-content">
          <h2>Error Loading Album</h2>
          <p>{error.message}</p>
          <button onClick={handleRetry} aria-label="Retry loading album">
            Retry
          </button>
          {error.code === 'NOT_FOUND' && (
            <button
              onClick={() => navigate('/')}
              aria-label="Go to home page"
            >
              Go to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  // Empty state (no children)
  // Defensive check: if data is null, we shouldn't be here (should be in loading/error state)
  // But handle it gracefully just in case
  if (!data || (albums.length === 0 && images.length === 0)) {
    return (
      <div
        className={
          className
            ? `album-detail album-detail-empty ${className}`
            : 'album-detail album-detail-empty'
        }
      >
        {showBackButton && (
          <button
            className="album-detail-back"
            onClick={handleBackClick}
            aria-label="Go back"
          >
            ← Back
          </button>
        )}
        {breadcrumbs && (
          <div className="album-detail-breadcrumbs">{breadcrumbs}</div>
        )}
        <AlbumDetailEmpty onBackClick={handleBackClick} />
      </div>
    );
  }

  // Main content
  return (
    <ErrorBoundary>
      <div
        className={
          className ? `album-detail ${className}` : 'album-detail'
        }
      >
      {showBackButton && (
        <button
          className="album-detail-back"
          onClick={handleBackClick}
          aria-label="Go back"
        >
          ← Back
        </button>
      )}
      {breadcrumbs && (
        <div className="album-detail-breadcrumbs">{breadcrumbs}</div>
      )}

      {/* Album metadata */}
      {(showTitle || showDescription) && album && (
        <div className="album-detail-header">
          {showTitle && album.title && (
            <h1 className="album-detail-title">{album.title}</h1>
          )}
          {showDescription && album.description && (
            <p className="album-detail-description">{album.description}</p>
          )}
        </div>
      )}

      {/* Child albums */}
      {albums.length > 0 && (
        <section
          className="album-detail-albums"
          aria-label="Child albums"
        >
          <div className="album-detail-section-header">
            <h2 className="album-detail-section-title">Albums</h2>
            <div className="album-detail-section-controls">
              <ViewModeToggle contentType="albums" />
              <SortDropdown
                currentOption={albumsSort.option}
                onOptionChange={albumsSort.setOption}
              />
            </div>
          </div>
          <AlbumGrid
            albums={albums}
            onAlbumClick={handleAlbumClick}
            sortOption={albumsSort.option}
            viewMode={albumViewMode}
          />
        </section>
      )}

      {/* Child images */}
      {images.length > 0 && (
        <section
          className="album-detail-images"
          aria-label="Images"
        >
          <div className="album-detail-section-header">
            <h2 className="album-detail-section-title">Images</h2>
            <div className="album-detail-section-controls">
              <ViewModeToggle contentType="images" />
              <SortDropdown
                currentOption={imagesSort.option}
                onOptionChange={imagesSort.setOption}
              />
            </div>
          </div>
          <ImageGrid
            images={images}
            onImageClick={handleImageClick}
            sortOption={imagesSort.option}
            viewMode={imageViewMode}
          />
        </section>
      )}
      </div>
    </ErrorBoundary>
  );
}

export default AlbumDetail;
