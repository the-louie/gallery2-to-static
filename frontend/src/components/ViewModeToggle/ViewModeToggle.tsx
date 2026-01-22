/**
 * View Mode Toggle Component
 *
 * An accessible button group that allows users to switch between grid and list
 * view modes for albums or images.
 *
 * ## Features
 *
 * - Two view modes: grid and list
 * - Separate controls for albums and images
 * - Accessible with proper ARIA attributes
 * - Keyboard navigable (Enter, Space)
 * - Visual icons for each mode
 *
 * ## Accessibility
 *
 * - Uses native button elements for built-in accessibility
 * - Dynamic aria-label describes current state and action
 * - Focus indicator meets WCAG 2.1 AA requirements
 * - Icons have aria-hidden="true" as they are decorative
 *
 * ## Usage
 *
 * ```tsx
 * import { ViewModeToggle } from './components/ViewModeToggle';
 *
 * function AlbumSection() {
 *   return (
 *     <section>
 *       <h2>Albums</h2>
 *       <ViewModeToggle contentType="albums" />
 *       <AlbumGrid />
 *     </section>
 *   );
 * }
 * ```
 */

import React from 'react';
import { useViewMode } from '../../contexts/ViewModeContext';
import type { ViewMode } from '../../types';
import './ViewModeToggle.css';

/**
 * Props for ViewModeToggle component
 */
export interface ViewModeToggleProps {
  /** Content type this toggle controls ('albums' or 'images') */
  contentType: 'albums' | 'images';
  /** Optional CSS class name */
  className?: string;
}

/**
 * Grid icon SVG component
 */
function GridIcon(): React.ReactElement {
  return (
    <svg
      className="view-mode-toggle-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

/**
 * List icon SVG component
 */
function ListIcon(): React.ReactElement {
  return (
    <svg
      className="view-mode-toggle-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

/**
 * Get aria-label for the button based on current view mode
 * @param contentType - Content type ('albums' or 'images')
 * @param currentMode - Current view mode
 * @param targetMode - Target view mode for the button
 * @returns Descriptive label for screen readers
 */
function getAriaLabel(
  contentType: 'albums' | 'images',
  currentMode: ViewMode,
  targetMode: ViewMode
): string {
  const contentLabel = contentType === 'albums' ? 'albums' : 'images';
  if (currentMode === targetMode) {
    return `${contentLabel} view: ${targetMode} mode (active). Click to switch to ${targetMode === 'grid' ? 'list' : 'grid'} mode.`;
  }
  return `Switch ${contentLabel} to ${targetMode} view`;
}

/**
 * View Mode Toggle Component
 *
 * Button group that allows switching between grid and list views.
 *
 * @param props - Component props
 * @returns View mode toggle buttons
 *
 * @example
 * ```tsx
 * <ViewModeToggle contentType="albums" />
 * <ViewModeToggle contentType="images" />
 * ```
 */
export function ViewModeToggle({
  contentType,
  className,
}: ViewModeToggleProps): React.ReactElement {
  const { albumViewMode, imageViewMode, setAlbumViewMode, setImageViewMode } = useViewMode();

  const currentMode = contentType === 'albums' ? albumViewMode : imageViewMode;
  const setViewMode = contentType === 'albums' ? setAlbumViewMode : setImageViewMode;

  const handleGridClick = () => {
    setViewMode('grid');
  };

  const handleListClick = () => {
    setViewMode('list');
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    targetMode: ViewMode
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setViewMode(targetMode);
    }
  };

  const containerClassName = className
    ? `view-mode-toggle ${className}`
    : 'view-mode-toggle';

  return (
    <div className={containerClassName} role="group" aria-label={`${contentType} view mode selector`}>
      <button
        type="button"
        className={`view-mode-toggle-button ${currentMode === 'grid' ? 'view-mode-toggle-button-active' : ''}`}
        onClick={handleGridClick}
        onKeyDown={(e) => handleKeyDown(e, 'grid')}
        aria-label={getAriaLabel(contentType, currentMode, 'grid')}
        aria-pressed={currentMode === 'grid'}
        title={`${contentType} view: grid`}
      >
        <GridIcon />
        <span className="view-mode-toggle-label">Grid</span>
      </button>
      <button
        type="button"
        className={`view-mode-toggle-button ${currentMode === 'list' ? 'view-mode-toggle-button-active' : ''}`}
        onClick={handleListClick}
        onKeyDown={(e) => handleKeyDown(e, 'list')}
        aria-label={getAriaLabel(contentType, currentMode, 'list')}
        aria-pressed={currentMode === 'list'}
        title={`${contentType} view: list`}
      >
        <ListIcon />
        <span className="view-mode-toggle-label">List</span>
      </button>
    </div>
  );
}

export default ViewModeToggle;
