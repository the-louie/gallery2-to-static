/**
 * AlbumGridSkeleton Component
 *
 * Loading placeholder component for AlbumGrid.
 * Displays skeleton items matching the grid layout.
 *
 * @module frontend/src/components/AlbumGrid
 */

import React from 'react';
import './AlbumGridSkeleton.css';

/**
 * Props for AlbumGridSkeleton component
 */
export interface AlbumGridSkeletonProps {
  /** Number of skeleton items to display (default: 6) */
  count?: number;
  /** Optional CSS class name */
  className?: string;
}

/**
 * AlbumGridSkeleton component
 *
 * Displays skeleton loading placeholders matching the AlbumGrid layout.
 *
 * @param props - Component props
 * @returns React component
 */
export function AlbumGridSkeleton({
  count = 6,
  className,
}: AlbumGridSkeletonProps) {
  return (
    <div
      className={className ? `album-grid-skeleton ${className}` : 'album-grid-skeleton'}
      role="status"
      aria-label="Loading albums"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="album-grid-skeleton-item">
          <div className="album-grid-skeleton-thumbnail" />
          <div className="album-grid-skeleton-content">
            <div className="album-grid-skeleton-title" />
            <div className="album-grid-skeleton-count" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default AlbumGridSkeleton;
