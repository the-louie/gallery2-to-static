/**
 * ErrorFallback Component
 *
 * Default fallback UI component displayed when an error boundary catches an error.
 * Provides user-friendly error message, retry functionality, and navigation options.
 *
 * @module frontend/src/components/ErrorBoundary
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import type { ErrorFallbackProps } from './ErrorBoundary';
import './ErrorFallback.css';

/**
 * ErrorFallback component
 *
 * Displays a user-friendly error message with options to retry or navigate home.
 * Shows error details in development mode only.
 *
 * @param props - Component props
 * @returns React component
 */
export function ErrorFallback({
  error,
  resetError,
  errorInfo,
}: ErrorFallbackProps): JSX.Element {
  const isDevelopment = import.meta.env.MODE === 'development';

  const handleGoHome = (): void => {
    // Use window.location.hash for navigation since ErrorBoundary may be outside Router context
    // This works with HashRouter and doesn't require Router context
    window.location.hash = '#/';
  };

  return (
    <div className="error-fallback" role="alert" aria-live="assertive">
      <div className="error-fallback-content">
        <FontAwesomeIcon
          icon={faTriangleExclamation}
          className="error-fallback-icon"
          aria-hidden
        />
        <h1 className="error-fallback-title">Something went wrong</h1>
        <p className="error-fallback-message">
          We encountered an unexpected error. Please try again or return to the home
          page.
        </p>

        {/* Error details in development mode */}
        {isDevelopment && errorInfo && (
          <details className="error-fallback-details">
            <summary className="error-fallback-details-summary">
              Error Details (Development Only)
            </summary>
            <div className="error-fallback-details-content">
              <p className="error-fallback-error-message">
                <strong>Error:</strong> {error.message}
              </p>
              {error.stack && (
                <pre className="error-fallback-stack">{error.stack}</pre>
              )}
              {errorInfo.componentStack && (
                <div className="error-fallback-component-stack">
                  <strong>Component Stack:</strong>
                  <pre>{errorInfo.componentStack}</pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Action buttons */}
        <div className="error-fallback-actions">
          <button
            type="button"
            onClick={resetError}
            className="error-fallback-button error-fallback-button-primary"
            aria-label="Retry loading the page"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={handleGoHome}
            className="error-fallback-button error-fallback-button-secondary"
            aria-label="Go to home page"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorFallback;
