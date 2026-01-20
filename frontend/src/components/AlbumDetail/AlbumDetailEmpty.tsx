/**
 * AlbumDetailEmpty Component
 *
 * Displays an empty state when an album has no children (no albums or images).
 *
 * @module frontend/src/components/AlbumDetail
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AlbumDetailEmpty.css';

/**
 * Props for the AlbumDetailEmpty component
 */
export interface AlbumDetailEmptyProps {
  /** Handler for back button clicks */
  onBackClick?: () => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * AlbumDetailEmpty component
 *
 * Displays a message when an album has no children.
 *
 * @param props - Component props
 * @returns React component
 */
export function AlbumDetailEmpty({
  onBackClick,
  className,
}: AlbumDetailEmptyProps) {
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  return (
    <div
      className={
        className
          ? `album-detail-empty ${className}`
          : 'album-detail-empty'
      }
    >
      <div className="album-detail-empty-content">
        <h2>Empty Album</h2>
        <p>This album contains no albums or images.</p>
        <div className="album-detail-empty-actions">
          <button
            onClick={handleBackClick}
            aria-label="Go back"
            className="album-detail-empty-button"
          >
            Go Back
          </button>
          <button
            onClick={handleHomeClick}
            aria-label="Go to home page"
            className="album-detail-empty-button"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlbumDetailEmpty;
