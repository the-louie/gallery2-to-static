/**
 * useRetry Hook
 *
 * Hook for implementing retry logic with exponential backoff and max retry limits.
 *
 * @module frontend/src/hooks
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Configuration for useRetry hook
 */
export interface UseRetryConfig {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay in milliseconds before first retry */
  initialDelay?: number;
  /** Maximum delay in milliseconds (caps exponential backoff) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Callback when max retries reached */
  onMaxRetriesReached?: () => void;
}

/**
 * Return type for useRetry hook
 */
export interface UseRetryReturn {
  /** Current retry attempt number (0 = no retries yet) */
  retryCount: number;
  /** Whether a retry is currently in progress */
  isRetrying: boolean;
  /** Whether more retries are available */
  canRetry: boolean;
  /** Function to execute a retry */
  retry: () => Promise<void>;
  /** Function to reset retry state */
  reset: () => void;
}

/**
 * Hook to manage retry logic with exponential backoff
 *
 * @param fn - Async function to retry
 * @param config - Configuration options
 * @returns Retry state and control functions
 *
 * @example
 * ```tsx
 * const { retry, canRetry, isRetrying } = useRetry(
 *   async () => await loadData(),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 * ```
 */
export function useRetry<T>(
  fn: () => Promise<T>,
  config: UseRetryConfig = {},
): UseRetryReturn {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    onMaxRetriesReached,
  } = config;

  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const configRef = useRef({ maxRetries, onMaxRetriesReached });
  const fnRef = useRef(fn);
  const isRetryingRef = useRef(false);
  const retryCountRef = useRef(0);

  // Update refs when they change
  useEffect(() => {
    configRef.current = { maxRetries, onMaxRetriesReached };
    fnRef.current = fn;
  }, [maxRetries, onMaxRetriesReached, fn]);

  // Sync refs with state
  useEffect(() => {
    retryCountRef.current = retryCount;
  }, [retryCount]);

  useEffect(() => {
    isRetryingRef.current = isRetrying;
  }, [isRetrying]);

  const calculateDelay = useCallback(
    (attempt: number): number => {
      const delay = initialDelay * Math.pow(backoffMultiplier, attempt);
      return Math.min(delay, maxDelay);
    },
    [initialDelay, backoffMultiplier, maxDelay],
  );

  const retry = useCallback(async (): Promise<void> => {
    // Check if we can retry using refs for synchronous check
    if (retryCountRef.current >= configRef.current.maxRetries || isRetryingRef.current) {
      return;
    }

    setIsRetrying(true);
    const currentAttempt = retryCountRef.current;

    // Execute retry logic
    const executeRetry = async (attempt: number): Promise<void> => {
      try {
        // Calculate delay for this retry attempt
        const delay = calculateDelay(attempt);

        // Wait for delay before retrying
        await new Promise<void>((resolve) => {
          timeoutRef.current = window.setTimeout(() => {
            resolve();
          }, delay);
        });

        // Execute the function using ref to avoid stale closure
        await fnRef.current();

        // Success - reset retry count
        setRetryCount(0);
        setIsRetrying(false);
      } catch (error) {
        // Increment retry count
        const newRetryCount = attempt + 1;
        setRetryCount(newRetryCount);
        setIsRetrying(false);

        // Check if max retries reached
        if (newRetryCount >= configRef.current.maxRetries) {
          configRef.current.onMaxRetriesReached?.();
        } else {
          // Continue retrying if more attempts available
          await executeRetry(newRetryCount);
        }
      }
    };

    // Start the retry process
    executeRetry(currentAttempt).catch(() => {
      // Handle any errors in the retry process itself
      setIsRetrying(false);
    });
  }, [calculateDelay]);

  const reset = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setRetryCount(0);
    setIsRetrying(false);
    retryCountRef.current = 0;
    isRetryingRef.current = false;
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const canRetry = retryCount < maxRetries;

  return {
    retryCount,
    isRetrying,
    canRetry,
    retry,
    reset,
  };
}
