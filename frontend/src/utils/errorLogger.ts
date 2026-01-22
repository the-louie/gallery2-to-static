/**
 * Error logging utility
 *
 * Provides centralized error logging with context collection and categorization.
 * Designed to be extensible for future external service integration.
 *
 * @module frontend/src/utils/errorLogger
 */

/**
 * Error categories for error classification
 */
export type ErrorCategory =
  | 'COMPONENT_ERROR'
  | 'ASYNC_ERROR'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR'
  | 'RENDER_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Error context information
 */
export interface ErrorContext {
  /** Error category */
  category: ErrorCategory;
  /** Component stack trace if available */
  componentStack?: string;
  /** Error message */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Additional error information */
  errorInfo?: React.ErrorInfo;
  /** Timestamp of the error */
  timestamp: Date;
  /** User agent information */
  userAgent?: string;
  /** URL where error occurred */
  url?: string;
}

/**
 * Error logging configuration
 */
export interface ErrorLoggerConfig {
  /** Enable or disable error logging */
  enabled: boolean;
  /** Log level (development, production) */
  logLevel: 'development' | 'production';
  /** Whether to log to console */
  logToConsole: boolean;
}

/**
 * Default error logger configuration
 */
const defaultConfig: ErrorLoggerConfig = {
  enabled: true,
  logLevel: import.meta.env.MODE === 'development' ? 'development' : 'production',
  logToConsole: true,
};

/**
 * Current error logger configuration
 */
let config: ErrorLoggerConfig = { ...defaultConfig };

/**
 * Configure error logger
 *
 * @param newConfig - Partial configuration to merge with defaults
 */
export function configureErrorLogger(newConfig: Partial<ErrorLoggerConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Categorize an error based on its type and properties
 *
 * @param error - The error to categorize
 * @returns Error category
 */
function categorizeError(error: Error): ErrorCategory {
  // Check for known error types from dataLoader
  if (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('fetch')) {
    return 'NETWORK_ERROR';
  }
  if (error.name === 'ParseError' || error.message.includes('parse') || error.message.includes('JSON')) {
    return 'PARSE_ERROR';
  }
  if (error.name === 'DataLoadError' || error.name === 'NotFoundError') {
    return 'NETWORK_ERROR';
  }
  if (error.message.includes('render') || error.message.includes('component')) {
    return 'RENDER_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Collect error context from error and error info
 *
 * @param error - The error object
 * @param errorInfo - React error info (optional)
 * @returns Error context object
 */
export function collectErrorContext(
  error: Error,
  errorInfo?: React.ErrorInfo,
): ErrorContext {
  return {
    category: categorizeError(error),
    componentStack: errorInfo?.componentStack,
    message: error.message,
    stack: error.stack,
    errorInfo,
    timestamp: new Date(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };
}

/**
 * Log an error with context
 *
 * @param error - The error to log
 * @param errorInfo - React error info (optional)
 * @param additionalContext - Additional context to include
 */
export function logError(
  error: Error,
  errorInfo?: React.ErrorInfo,
  additionalContext?: Record<string, unknown>,
): void {
  if (!config.enabled) {
    return;
  }

  const context = collectErrorContext(error, errorInfo);

  // Merge additional context
  const fullContext = additionalContext
    ? { ...context, ...additionalContext }
    : context;

  // Log to console in development or if explicitly enabled
  if (config.logToConsole && config.logLevel === 'development') {
    console.group('🚨 Error Logged');
    console.error('Error:', error);
    console.error('Category:', fullContext.category);
    console.error('Message:', fullContext.message);
    if (fullContext.componentStack) {
      console.error('Component Stack:', fullContext.componentStack);
    }
    if (fullContext.stack) {
      console.error('Stack Trace:', fullContext.stack);
    }
    if (additionalContext) {
      console.error('Additional Context:', additionalContext);
    }
    console.error('Timestamp:', fullContext.timestamp.toISOString());
    console.groupEnd();
  } else if (config.logToConsole && config.logLevel === 'production') {
    // In production, log minimal information
    console.error('Error:', fullContext.message, {
      category: fullContext.category,
      timestamp: fullContext.timestamp.toISOString(),
    });
  }

  // Future: Send to external error logging service
  // Example: sendToErrorService(fullContext);
}

/**
 * Log a component error (from error boundary)
 *
 * @param error - The error object
 * @param errorInfo - React error info
 */
export function logComponentError(error: Error, errorInfo: React.ErrorInfo): void {
  logError(error, errorInfo, {
    errorType: 'COMPONENT_ERROR',
  });
}

/**
 * Log an async error
 *
 * @param error - The error object
 * @param context - Additional context about where the error occurred
 */
export function logAsyncError(error: Error, context?: Record<string, unknown>): void {
  logError(error, undefined, {
    errorType: 'ASYNC_ERROR',
    ...context,
  });
}
