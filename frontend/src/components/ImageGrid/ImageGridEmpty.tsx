/**
 * ImageGridEmpty Component
 *
 * Empty state component for ImageGrid when no images are found.
 *
 * @module frontend/src/components/ImageGrid
 */

import React from 'react';
import './ImageGridEmpty.css';

/**
 * Props for ImageGridEmpty component
 */
export interface ImageGridEmptyProps {
  /** Optional custom empty message */
  message?: string;
  /** Optional CSS class name */
  className?: string;
}

/**
 * ImageGridEmpty component
 *
 * Displays an empty state message when no images are found.
 *
 * @param props - Component props
 * @returns React component
 */
export function ImageGridEmpty({
  message = 'No images found',
  className,
}: ImageGridEmptyProps) {
  return (
    <div
      className={className ? `image-grid-empty ${className}` : 'image-grid-empty'}
      role="status"
      aria-live="polite"
    >
      <p className="image-grid-empty-message">{message}</p>
    </div>
  );
}

export default ImageGridEmpty;
