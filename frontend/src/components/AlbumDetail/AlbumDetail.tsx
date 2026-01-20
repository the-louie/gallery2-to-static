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
import { useAlbumData } from '@/hooks/useAlbumData';
import { AlbumGrid } from '@/components/AlbumGrid';
import { ImageGrid } from '@/components/ImageGrid';
import { AlbumDetailEmpty } from './AlbumDetailEmpty';
import type { Album, Image } from '@/types';
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

  // Use album prop if provided, otherwise null (metadata is optional)
  const album = albumProp || null;

  // Separate albums and images from the data
  const albums = useMemo<Album[]>(() => {
    if (!data) {
      return [];
    }
    return data.filter(isAlbum);
  }, [data]);

  const images = useMemo<Image[]>(() => {
    if (!data) {
      return [];
    }
    return data.filter(isImage);
  }, [data]);

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
        navigate(`/image/${clickedImage.id}`);
      }
    },
    [onImageClick, navigate],
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
          <h2 className="album-detail-section-title">Albums</h2>
          <AlbumGrid albums={albums} onAlbumClick={handleAlbumClick} />
        </section>
      )}

      {/* Child images */}
      {images.length > 0 && (
        <section
          className="album-detail-images"
          aria-label="Images"
        >
          <h2 className="album-detail-section-title">Images</h2>
          <ImageGrid images={images} onImageClick={handleImageClick} />
        </section>
      )}
    </div>
  );
}

export default AlbumDetail;
