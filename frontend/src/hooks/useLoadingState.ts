/**
 * useLoadingState Hook
 *
 * Hook for managing loading state with transitions and timeout handling.
 *
 * @module frontend/src/hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Configuration for useLoadingState hook
 */
export interface UseLoadingStateConfig {
  /** Timeout in milliseconds before showing loading state (prevents flash) */
  delay?: number;
  /** Maximum loading duration before timeout warning */
  timeout?: number;
  /** Callback when timeout is reached */
  onTimeout?: () => void;
}

/**
 * Return type for useLoadingState hook
 */
export interface UseLoadingStateReturn {
  /** Whether loading is active */
  isLoading: boolean;
  /** Whether loading has timed out */
  isTimeout: boolean;
  /** Function to set loading state */
  setLoading: (loading: boolean) => void;
  /** Function to start loading */
  startLoading: () => void;
  /** Function to stop loading */
  stopLoading: () => void;
  /** Function to reset loading state */
  reset: () => void;
}

/**
 * Hook to manage loading state with transitions and timeout handling
 *
 * @param config - Configuration options
 * @returns Loading state and control functions
 *
 * @example
 * ```tsx
 * const { isLoading, startLoading, stopLoading } = useLoadingState({
 *   delay: 200,
 *   timeout: 10000,
 * });
 * ```
 */
export function useLoadingState(
  config: UseLoadingStateConfig = {},
): UseLoadingStateReturn {
  const { delay = 0, timeout, onTimeout } = config;

  const [isLoading, setIsLoading] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);

  const delayTimerRef = useRef<number | null>(null);
  const timeoutTimerRef = useRef<number | null>(null);
  const actualLoadingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (delayTimerRef.current !== null) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (timeoutTimerRef.current !== null) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  const setLoading = useCallback(
    (loading: boolean) => {
      actualLoadingRef.current = loading;

      if (loading) {
        // Start loading with delay
        if (delay > 0) {
          delayTimerRef.current = window.setTimeout(() => {
            if (actualLoadingRef.current) {
              setIsLoading(true);
              setIsTimeout(false);

              // Set timeout if configured
              if (timeout) {
                timeoutTimerRef.current = window.setTimeout(() => {
                  if (actualLoadingRef.current) {
                    setIsTimeout(true);
                    onTimeout?.();
                  }
                }, timeout);
              }
            }
          }, delay);
        } else {
          setIsLoading(true);
          setIsTimeout(false);

          if (timeout) {
            timeoutTimerRef.current = window.setTimeout(() => {
              if (actualLoadingRef.current) {
                setIsTimeout(true);
                onTimeout?.();
              }
            }, timeout);
          }
        }
      } else {
        // Stop loading immediately
        clearTimers();
        setIsLoading(false);
        setIsTimeout(false);
      }
    },
    [delay, timeout, onTimeout, clearTimers],
  );

  const startLoading = useCallback(() => {
    setLoading(true);
  }, [setLoading]);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, [setLoading]);

  const reset = useCallback(() => {
    clearTimers();
    actualLoadingRef.current = false;
    setIsLoading(false);
    setIsTimeout(false);
  }, [clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    isLoading,
    isTimeout,
    setLoading,
    startLoading,
    stopLoading,
    reset,
  };
}
