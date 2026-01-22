/**
 * LoadingSpinner Component
 *
 * A reusable loading spinner component with configurable size variants and
 * accessibility support.
 *
 * @module frontend/src/components/LoadingSpinner
 */

import React from 'react';
import './LoadingSpinner.css';

/**
 * Size variants for the loading spinner
 */
export type LoadingSpinnerSize = 'small' | 'medium' | 'large';

/**
 * Props for LoadingSpinner component
 */
export interface LoadingSpinnerProps {
  /** Size variant of the spinner */
  size?: LoadingSpinnerSize;
  /** Optional CSS class name */
  className?: string;
  /** Optional label for accessibility */
  label?: string;
}

/**
 * LoadingSpinner component
 *
 * Displays an animated loading spinner with configurable size.
 * Includes proper ARIA attributes for accessibility.
 *
 * @param props - Component props
 * @returns React component
 */
export function LoadingSpinner({
  size = 'medium',
  className,
  label = 'Loading...',
}: LoadingSpinnerProps): JSX.Element {
  return (
    <div
      className={`loading-spinner loading-spinner-${size}${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <div className="loading-spinner-circle" aria-hidden="true">
        <div className="loading-spinner-inner" />
      </div>
      {label && (
        <span className="loading-spinner-label" aria-hidden="true">
          {label}
        </span>
      )}
    </div>
  );
}

export default LoadingSpinner;
