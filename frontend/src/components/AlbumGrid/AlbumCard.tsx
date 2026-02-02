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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder } from '@fortawesome/free-solid-svg-icons';
import type { Album } from '@/types';
import { getAlbumThumbnailUrl } from '@/utils/imageUrl';
import { parseBBCodeDecoded } from '@/utils/bbcode';
import { decodeHtmlEntities } from '@/utils/decodeHtmlEntities';
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

  const defaultAriaLabel = decodeHtmlEntities(album.title || 'Album');
  const cardAriaLabel = ariaLabel || defaultAriaLabel;

  // Parse BBCode in title for display
  const parsedTitle = useMemo(() => {
    if (!album.title) {
      return 'Untitled Album';
    }
    return parseBBCodeDecoded(album.title);
  }, [album.title]);

  const cardClassName = className ? `album-card ${className}` : 'album-card';

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
            alt={decodeHtmlEntities(album.title || 'Album thumbnail')}
            className="album-card-thumbnail-image"
            onError={handleImageError}
          />
        ) : (
          <div className="album-card-thumbnail-placeholder" aria-hidden="true">
            <FontAwesomeIcon
              icon={faFolder}
              className="album-card-thumbnail-icon"
              aria-hidden
            />
          </div>
        )}
      </div>
      <div className="album-card-content">
        <h3 className="album-card-title">{parsedTitle}</h3>
        {album.totalDescendantImageCount != null && (
          <p className="album-card-images-total">{album.totalDescendantImageCount} images</p>
        )}
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
