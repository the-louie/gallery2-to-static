/**
 * useOfflineDetection Hook
 *
 * Hook for detecting online/offline status using the Navigator API and
 * online/offline events.
 *
 * @module frontend/src/hooks
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Return type for useOfflineDetection hook
 */
export interface UseOfflineDetectionReturn {
  /** Whether the device is currently offline */
  isOffline: boolean;
  /** Whether the device is currently online */
  isOnline: boolean;
}

/**
 * Hook to detect online/offline status
 *
 * Uses the Navigator.onLine API and listens to online/offline events
 * for real-time updates.
 *
 * @returns Online/offline status
 *
 * @example
 * ```tsx
 * const { isOffline, isOnline } = useOfflineDetection();
 *
 * if (isOffline) {
 *   return <OfflineIndicator />;
 * }
 * ```
 */
export function useOfflineDetection(): UseOfflineDetectionReturn {
  // Initialize with current online status
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });

  const handleOnline = useCallback(() => {
    setIsOffline(false);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOffline(true);
  }, []);

  useEffect(() => {
    // Listen to online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOffline,
    isOnline: !isOffline,
  };
}
