/**
 * AlbumDetailEmpty Component
 *
 * Displays an empty state when an album has no children (no albums or images).
 *
 * @module frontend/src/components/AlbumDetail
 */

import { useNavigate } from 'react-router-dom';
import './AlbumDetailEmpty.css';

/**
 * Props for the AlbumDetailEmpty component
 */
export interface AlbumDetailEmptyProps {
  /** Handler for back button clicks */
  onBackClick?: () => void;
  /** Whether to show the Go Up button (default: true). Hide when at root album. */
  showGoUp?: boolean;
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
  showGoUp = true,
  className,
}: AlbumDetailEmptyProps) {
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate('/');
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
          {showGoUp && (
            <button
              type="button"
              onClick={handleBackClick}
              aria-label="Go up"
              className="album-detail-empty-button"
            >
              Go Up
            </button>
          )}
          <button
            type="button"
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
