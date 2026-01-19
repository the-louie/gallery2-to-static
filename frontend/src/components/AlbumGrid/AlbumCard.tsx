/**
 * AlbumCard Component
 *
 * Individual album display component for use within AlbumGrid.
 * Displays album thumbnail (if available), title, and child count.
 * Supports keyboard navigation and accessibility features.
 *
 * @module frontend/src/components/AlbumGrid
 */

import React, { useCallback } from 'react';
import type { Album } from '@/types';
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
 * Displays a single album with thumbnail, title, and child count.
 * Supports keyboard navigation and click handling.
 *
 * @param props - Component props
 * @returns React component
 */
export function AlbumCard({
  album,
  onClick,
  className,
  'aria-label': ariaLabel,
}: AlbumCardProps) {
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

  const defaultAriaLabel = album.title || 'Album';
  const cardAriaLabel = ariaLabel || defaultAriaLabel;

  // Albums are containers, not images, so always show placeholder
  // In the future, if album thumbnails are supported, check thumb_width/thumb_height here
  const childCountText = album.hasChildren
    ? 'Has children'
    : 'No children';

  return (
    <article
      className={className ? `album-card ${className}` : 'album-card'}
      role="article"
      aria-label={cardAriaLabel}
      aria-describedby={`album-card-count-${album.id}`}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
    >
      <div className="album-card-thumbnail">
        <div className="album-card-thumbnail-placeholder" aria-hidden="true">
          <span className="album-card-thumbnail-icon">📁</span>
        </div>
      </div>
      <div className="album-card-content">
        <h3 className="album-card-title">{album.title || 'Untitled Album'}</h3>
        <div
          id={`album-card-count-${album.id}`}
          className="album-card-count"
          aria-label={childCountText}
        >
          {childCountText}
        </div>
      </div>
    </article>
  );
}

export default AlbumCard;
