/**
 * AlbumCard Component
 *
 * Individual album display component for use within AlbumGrid.
 * Displays album thumbnail (if available) and title.
 * Supports keyboard navigation and accessibility features.
 *
 * The album title supports BBCode formatting (e.g., [b]bold[/b], [i]italic[/i]).
 * Only the title field supports BBCode; other fields are rendered as plain text.
 *
 * @module frontend/src/components/AlbumGrid
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import type { Album, ViewMode } from '@/types';
import { getAlbumThumbnailUrl } from '@/utils/imageUrl';
import { parseBBCode } from '@/utils/bbcode';
import './AlbumCard.css';

/**
 * Props for AlbumCard component
 */
export interface AlbumCardProps {
  /** The album to display */
  album: Album;
  /** Optional click handler */
  onClick?: (album: Album) => void;
  /** Optional CSS class name */
  className?: string;
  /** Optional aria-label override */
  'aria-label'?: string;
  /** View mode: 'grid' or 'list' (default: 'grid') */
  viewMode?: ViewMode;
}

/**
 * AlbumCard component
 *
 * Displays a single album with thumbnail and title.
 * Supports keyboard navigation and click handling.
 *
 * @param props - Component props
 * @returns React component
 */
function AlbumCardComponent({
  album,
  onClick,
  className,
  'aria-label': ariaLabel,
  viewMode = 'grid',
}: AlbumCardProps) {
  const [imageError, setImageError] = useState(false);
  const thumbnailUrl = getAlbumThumbnailUrl(album);
  const shouldShowThumbnail = thumbnailUrl !== null && !imageError;

  // Reset error state when thumbnail URL changes
  useEffect(() => {
    setImageError(false);
  }, [thumbnailUrl]);

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(album);
    }
  }, [onClick, album]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (onClick && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        handleClick();
      }
    },
    [onClick, handleClick],
  );

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const defaultAriaLabel = album.title || 'Album';
  const cardAriaLabel = ariaLabel || defaultAriaLabel;

  // Parse BBCode in title for display
  const parsedTitle = useMemo(() => {
    if (!album.title) {
      return 'Untitled Album';
    }
    return parseBBCode(album.title);
  }, [album.title]);

  const cardClassName = className
    ? `album-card album-card-${viewMode} ${className}`
    : `album-card album-card-${viewMode}`;

  return (
    <article
      className={cardClassName}
      role="article"
      aria-label={cardAriaLabel}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
    >
      <div className="album-card-thumbnail">
        {shouldShowThumbnail && thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={album.title || 'Album thumbnail'}
            className="album-card-thumbnail-image"
            onError={handleImageError}
          />
        ) : (
          <div className="album-card-thumbnail-placeholder" aria-hidden="true">
            <span className="album-card-thumbnail-icon">📁</span>
          </div>
        )}
      </div>
      <div className="album-card-content">
        <h3 className="album-card-title">{parsedTitle}</h3>
      </div>
    </article>
  );
}

/**
 * Memoized AlbumCard component to prevent unnecessary re-renders
 * when props haven't changed.
 */
export const AlbumCard = React.memo(AlbumCardComponent);

export default AlbumCard;
