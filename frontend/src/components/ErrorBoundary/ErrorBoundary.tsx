/**
 * ErrorBoundary Component
 *
 * React error boundary component that catches JavaScript errors in child components,
 * logs them, and displays a fallback UI instead of crashing the entire app.
 *
 * Error boundaries catch errors during:
 * - Rendering
 * - In lifecycle methods
 * - In constructors of the whole tree below them
 *
 * Error boundaries do NOT catch errors in:
 * - Event handlers
 * - Asynchronous code (setTimeout, promises, etc.)
 * - Server-side rendering
 * - Errors thrown in the error boundary itself
 *
 * @module frontend/src/components/ErrorBoundary
 */

import React, { Component, type ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';
import { logComponentError } from '@/utils/errorLogger';

/**
 * Props for ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Custom fallback UI component (optional) */
  fallback?: React.ComponentType<ErrorFallbackProps>;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Array of values to reset error boundary when they change */
  resetKeys?: Array<string | number>;
  /** Fallback UI props */
  fallbackProps?: Partial<ErrorFallbackProps>;
}

/**
 * Props for ErrorFallback component
 */
export interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Function to reset the error boundary */
  resetError: () => void;
  /** React error info */
  errorInfo?: React.ErrorInfo;
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** The error that was caught, null if no error */
  error: Error | null;
  /** React error info */
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary component
 *
 * Class component required for error boundaries (React doesn't support
 * error boundaries in functional components yet).
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state so the next render will show the fallback UI
   *
   * @param error - The error that was thrown
   * @returns Updated state
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      error,
    };
  }

  /**
   * Called after an error has been thrown by a descendant component
   *
   * @param error - The error that was thrown
   * @param errorInfo - Information about which component threw the error
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Log the error
    logComponentError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset error boundary when resetKeys change
   */
  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys } = this.props;
    const { error } = this.state;

    // Reset error boundary if resetKeys changed and there's an error
    if (error !== null && resetKeys) {
      // If resetKeys didn't exist before, don't reset
      if (!prevProps.resetKeys) {
        return;
      }

      // Check if resetKeys array length changed
      if (resetKeys.length !== prevProps.resetKeys.length) {
        this.resetError();
        return;
      }

      // Check if any key value changed
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys[index],
      );

      if (hasResetKeyChanged) {
        this.resetError();
      }
    }
  }

  /**
   * Reset the error boundary state
   */
  resetError = (): void => {
    this.setState({
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { error, errorInfo } = this.state;
    const { children, fallback: Fallback = ErrorFallback, fallbackProps } = this.props;

    // If there's an error, render fallback UI
    if (error) {
      return (
        <Fallback
          error={error}
          resetError={this.resetError}
          errorInfo={errorInfo || undefined}
          {...fallbackProps}
        />
      );
    }

    // Otherwise, render children normally
    return children;
  }
}

export default ErrorBoundary;
