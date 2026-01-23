/**
 * React hook for managing scroll position saving
 *
 * Provides scroll position save functionality for virtual scrolling grids.
 * Uses sessionStorage to persist scroll positions across navigation.
 * Note: Scroll restoration is handled by React Router and browser's native
 * scroll restoration, not by this hook.
 *
 * ## Features
 *
 * - Automatic scroll position save on scroll events
 * - Scroll positions stored per album and component type
 * - Debounced scroll saving to prevent performance issues
 * - Automatic cleanup of old scroll positions
 * - Note: Scroll restoration is handled by React Router/browser, not this hook
 *
 * ## Usage
 *
 * ```tsx
 * const { saveScrollPosition } = useScrollPosition(albumId, 'album-grid');
 *
 * // In VirtualGrid:
 * <VirtualGrid
 *   onScroll={saveScrollPosition}
 * />
 * ```
 *
 * @module frontend/src/hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Storage key prefix for scroll positions
 */
const SCROLL_POSITION_PREFIX = 'scroll-position-';

/**
 * Maximum age for stored scroll positions (24 hours in milliseconds)
 */
const MAX_SCROLL_POSITION_AGE = 24 * 60 * 60 * 1000;

/**
 * Debounce delay for scroll position saving (ms)
 */
const SCROLL_SAVE_DEBOUNCE = 300;

/**
 * Generate storage key for scroll position
 *
 * @param albumId - Album ID (null for root/home)
 * @param componentType - Component type identifier ('album-grid' or 'image-grid')
 * @returns Storage key string
 */
function generateScrollKey(albumId: number | null, componentType: string): string {
  const id = albumId !== null ? albumId.toString() : 'root';
  return `${SCROLL_POSITION_PREFIX}${componentType}-${id}`;
}

/**
 * Load scroll position from sessionStorage
 *
 * @param key - Storage key
 * @returns Scroll position or null if not found/invalid
 */
function loadScrollPosition(key: string): number | null {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null;
  }

  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;

    const data = JSON.parse(stored);
    const now = Date.now();

    // Check if data is too old
    if (data.timestamp && now - data.timestamp > MAX_SCROLL_POSITION_AGE) {
      sessionStorage.removeItem(key);
      return null;
    }

    return typeof data.scrollTop === 'number' && data.scrollTop >= 0 ? data.scrollTop : null;
  } catch (error) {
    // Invalid data or parse error - remove it
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore removal errors
    }
    return null;
  }
}

/**
 * Save scroll position to sessionStorage
 *
 * @param key - Storage key
 * @param scrollTop - Scroll position
 */
function saveScrollPositionToStorage(key: string, scrollTop: number): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  try {
    const data = {
      scrollTop,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    // Storage quota exceeded or other error - ignore
    // Don't log to avoid console spam
  }
}

/**
 * Cleanup old scroll positions
 *
 * Removes scroll positions older than MAX_SCROLL_POSITION_AGE
 */
function cleanupOldScrollPositions(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(SCROLL_POSITION_PREFIX)) {
        try {
          const stored = sessionStorage.getItem(key);
          if (stored) {
            const data = JSON.parse(stored);
            if (data.timestamp && now - data.timestamp > MAX_SCROLL_POSITION_AGE) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Invalid data - remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Ignore removal errors
      }
    });
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Return type for useScrollPosition hook
 */
export interface UseScrollPositionReturn {
  /** Current scroll position (restored from storage or 0) */
  scrollTop: number;
  /** Function to manually set scroll position */
  setScrollTop: (scrollTop: number) => void;
  /** Function to save scroll position (debounced) */
  saveScrollPosition: (scrollTop: number) => void;
  /** Function to clear stored scroll position */
  clearScrollPosition: () => void;
}

/**
 * Hook to manage scroll position saving for virtual scrolling grids
 *
 * Automatically saves scroll position using sessionStorage.
 * Scroll positions are keyed by albumId and component type for uniqueness.
 * Note: This hook only saves scroll positions. Restoration is handled by
 * React Router and the browser's native scroll restoration.
 *
 * @param albumId - Album ID (null for root/home)
 * @param componentType - Component type identifier ('album-grid' or 'image-grid')
 * @returns Object with scrollTop (for reference), setScrollTop, saveScrollPosition, and clearScrollPosition
 *
 * @example
 * ```tsx
 * const { saveScrollPosition } = useScrollPosition(albumId, 'album-grid');
 *
 * <VirtualGrid
 *   onScroll={saveScrollPosition}
 * />
 * ```
 */
export function useScrollPosition(
  albumId: number | null,
  componentType: string,
): UseScrollPositionReturn {
  const [scrollTop, setScrollTopState] = useState<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKeyRef = useRef<string>(generateScrollKey(albumId, componentType));

  // Update storage key when albumId or componentType changes
  useEffect(() => {
    storageKeyRef.current = generateScrollKey(albumId, componentType);
  }, [albumId, componentType]);

  // Load scroll position on mount and when key changes
  useEffect(() => {
    const key = storageKeyRef.current;
    if (!key) return;

    const stored = loadScrollPosition(key);
    if (stored !== null) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        setScrollTopState(stored);
      });
    }

    // Cleanup old positions on mount (runs once per session)
    cleanupOldScrollPositions();
  }, [albumId, componentType]);

  // Manual set scroll position
  const setScrollTop = useCallback((newScrollTop: number) => {
    setScrollTopState(newScrollTop);
    const key = storageKeyRef.current;
    if (key) {
      saveScrollPositionToStorage(key, newScrollTop);
    }
  }, []);

  // Save scroll position (debounced)
  const saveScrollPosition = useCallback(
    (newScrollTop: number) => {
      // Update state immediately for UI responsiveness
      setScrollTopState(newScrollTop);

      // Debounce storage save
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const key = storageKeyRef.current;
        if (key) {
          saveScrollPositionToStorage(key, newScrollTop);
        }
        debounceTimerRef.current = null;
      }, SCROLL_SAVE_DEBOUNCE);
    },
    [],
  );

  // Clear stored scroll position
  const clearScrollPosition = useCallback(() => {
    setScrollTopState(0);
    const key = storageKeyRef.current;
    if (key && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Ignore removal errors
      }
    }
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    scrollTop,
    setScrollTop,
    saveScrollPosition,
    clearScrollPosition,
  };
}
