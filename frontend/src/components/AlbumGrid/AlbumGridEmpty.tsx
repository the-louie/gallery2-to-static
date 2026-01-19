/**
 * AlbumGridEmpty Component
 *
 * Empty state component for AlbumGrid when no albums are found.
 *
 * @module frontend/src/components/AlbumGrid
 */

import React from 'react';
import './AlbumGridEmpty.css';

/**
 * Props for AlbumGridEmpty component
 */
export interface AlbumGridEmptyProps {
  /** Optional custom empty message */
  message?: string;
  /** Optional CSS class name */
  className?: string;
}

/**
 * AlbumGridEmpty component
 *
 * Displays an empty state message when no albums are found.
 *
 * @param props - Component props
 * @returns React component
 */
export function AlbumGridEmpty({
  message = 'No albums found',
  className,
}: AlbumGridEmptyProps) {
  return (
    <div
      className={className ? `album-grid-empty ${className}` : 'album-grid-empty'}
      role="status"
      aria-live="polite"
    >
      <p className="album-grid-empty-message">{message}</p>
    </div>
  );
}

export default AlbumGridEmpty;
