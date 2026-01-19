/**
 * ImageGridSkeleton Component
 *
 * Loading placeholder component for ImageGrid.
 * Displays skeleton items matching the grid layout.
 *
 * @module frontend/src/components/ImageGrid
 */

import React from 'react';
import './ImageGridSkeleton.css';

/**
 * Props for ImageGridSkeleton component
 */
export interface ImageGridSkeletonProps {
  /** Number of skeleton items to display (default: 6) */
  count?: number;
  /** Optional CSS class name */
  className?: string;
}

/**
 * ImageGridSkeleton component
 *
 * Displays skeleton loading placeholders matching the ImageGrid layout.
 *
 * @param props - Component props
 * @returns React component
 */
export function ImageGridSkeleton({
  count = 6,
  className,
}: ImageGridSkeletonProps) {
  return (
    <div
      className={className ? `image-grid-skeleton ${className}` : 'image-grid-skeleton'}
      role="status"
      aria-label="Loading images"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="image-grid-skeleton-item">
          <div className="image-grid-skeleton-thumbnail" />
        </div>
      ))}
    </div>
  );
}

export default ImageGridSkeleton;
