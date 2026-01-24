/**
 * AlbumDetail Component
 *
 * A reusable component that displays album details, including album metadata
 * (title, description, summary, owner name when present), child albums, and
 * child images. Handles navigation, empty states, and integrates with React Router.
 *
 * The album title supports BBCode formatting (e.g., [b]bold[/b], [i]italic[/i]).
 * Only the title field supports BBCode; description and summary are rendered as plain text.
 *
 * @module frontend/src/components/AlbumDetail
 */

import React, { useMemo, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAlbumData } from '@/hooks/useAlbumData';
import { useSort } from '@/hooks/useSort';
import { useFilter } from '@/contexts/FilterContext';
import { useSiteMetadata } from '@/hooks/useSiteMetadata';
import { useAlbumMetadata } from '@/hooks/useAlbumMetadata';
import { applyFilters } from '@/utils/filterUtils';
import { parseBBCode } from '@/utils/bbcode';
import { albumFromMetadata } from '@/utils/albumMetadata';
import { getParentAlbumId } from '@/utils/breadcrumbPath';
import { AlbumGrid } from '@/components/AlbumGrid';
import { ImageGrid } from '@/components/ImageGrid';
import { SortDropdown } from '@/components/SortDropdown';
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
  const { data, metadata, isLoading, error, refetch } = useAlbumData(albumId);
  const [isNavigatingUp, setIsNavigatingUp] = useState(false);
  const isNavigatingRef = useRef(false);
  const { rootAlbumId } = useSiteMetadata();

  // Get filter criteria from context
  const { criteria } = useFilter();

  // Get sort preferences for albums and images
  const albumsSort = useSort('albums');
  const imagesSort = useSort('images');

  const albumPropFromFile = useMemo(
    () => (metadata ? albumFromMetadata(metadata) : null),
    [metadata],
  );
  const albumPropToUse = albumPropFromFile ?? albumProp ?? undefined;
  const album = useAlbumMetadata(albumId, albumPropToUse, rootAlbumId);

  // Check if this is the root album
  const isRootAlbum = rootAlbumId !== null && albumId === rootAlbumId;

  // Parse BBCode in album title for display
  const parsedTitle = useMemo(() => {
    if (!album || !album.title) {
      return null;
    }
    return parseBBCode(album.title);
  }, [album]);

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

  const handleBackClick = useCallback(async () => {
    if (onBackClick) {
      onBackClick();
      return;
    }

    if (isRootAlbum) {
      return;
    }

    if (isNavigatingRef.current) {
      return;
    }

    isNavigatingRef.current = true;
    setIsNavigatingUp(true);
    try {
      const parentId = await getParentAlbumId(albumId);
      if (parentId !== null) {
        navigate(`/album/${parentId}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.warn('Error finding parent album, navigating to home:', err);
      navigate('/');
    } finally {
      isNavigatingRef.current = false;
      setIsNavigatingUp(false);
    }
  }, [onBackClick, navigate, albumId, isRootAlbum]);

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
        {showBackButton && !isRootAlbum && (
          <button
            type="button"
            className="album-detail-back"
            onClick={handleBackClick}
            aria-label="Go up"
            disabled={isNavigatingUp}
          >
            ↑ Up
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
        {showBackButton && !isRootAlbum && (
          <button
            type="button"
            className="album-detail-back"
            onClick={handleBackClick}
            aria-label="Go up"
            disabled={isNavigatingUp}
          >
            ↑ Up
          </button>
        )}
        {breadcrumbs && (
          <div className="album-detail-breadcrumbs">{breadcrumbs}</div>
        )}
        <div className="album-detail-error-content" role="alert" aria-live="assertive">
          <h2>Error Loading Album</h2>
          <p>{error.message}</p>
          <button type="button" onClick={handleRetry} aria-label="Retry loading album">
            Retry
          </button>
          {error.code === 'NOT_FOUND' && (
            <button
              type="button"
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
        {showBackButton && !isRootAlbum && (
          <button
            type="button"
            className="album-detail-back"
            onClick={handleBackClick}
            aria-label="Go up"
            disabled={isNavigatingUp}
          >
            ↑ Up
          </button>
        )}
        {breadcrumbs && (
          <div className="album-detail-breadcrumbs">{breadcrumbs}</div>
        )}
        <AlbumDetailEmpty onBackClick={handleBackClick} showGoUp={!isRootAlbum} />
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
      {showBackButton && !isRootAlbum && (
        <button
          type="button"
          className="album-detail-back"
          onClick={handleBackClick}
          aria-label="Go up"
          disabled={isNavigatingUp}
        >
          ← Up
        </button>
      )}
      {breadcrumbs && (
        <div className="album-detail-breadcrumbs">{breadcrumbs}</div>
      )}

      {/* Album metadata */}
      {album && (
        <div className="album-detail-header">
          {!isRootAlbum && showTitle && parsedTitle && (
            <h2 className="album-detail-title">{parsedTitle}</h2>
          )}
          {!isRootAlbum && showDescription && showTitle && parsedTitle && album.description && (
            <p className="album-detail-description">{album.description}</p>
          )}
          {typeof album.summary === 'string' && album.summary.trim() && (
            <p className="album-detail-summary">{album.summary.trim()}</p>
          )}
          {typeof album.ownerName === 'string' && album.ownerName.trim() && (
            <p className="album-detail-owner">
              Owner: {album.ownerName.trim()}
            </p>
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
          />
        </section>
      )}
      </div>
    </ErrorBoundary>
  );
}

export default AlbumDetail;
