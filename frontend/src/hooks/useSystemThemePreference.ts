/**
 * React hook for detecting system theme preference
 *
 * Uses the `prefers-color-scheme` media query to detect if the user's
 * operating system prefers dark or light mode. Automatically updates
 * when the system preference changes.
 *
 * ## Features
 *
 * - Detects system preference via prefers-color-scheme media query
 * - Automatically updates when system preference changes
 * - Handles browsers without media query support (defaults to 'light')
 * - Supports both addEventListener (modern) and addListener (legacy) APIs
 * - Robust error handling for matchMedia failures
 * - Cleans up event listeners on unmount
 * - Handles rapid preference changes gracefully
 *
 * ## Browser Support
 *
 * The `prefers-color-scheme` media query is supported in:
 * - Chrome 76+
 * - Firefox 67+
 * - Safari 12.1+
 * - Edge 79+
 *
 * For browsers without support, the hook returns 'light' as the default.
 *
 * ## Usage
 *
 * ```tsx
 * function ThemeDetector() {
 *   const systemPreference = useSystemThemePreference();
 *
 *   return (
 *     <div>
 *       System prefers: {systemPreference} mode
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect } from 'react';

/** Theme values that can be detected from system preferences */
export type SystemTheme = 'light' | 'dark';

/**
 * Media query string for detecting dark mode preference
 */
const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

/**
 * Check if matchMedia is available
 * @returns true if window.matchMedia is available
 */
function isMatchMediaAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/**
 * Get the current system theme preference
 * @returns 'dark' if system prefers dark mode, 'light' otherwise
 */
function getSystemTheme(): SystemTheme {
  if (!isMatchMediaAvailable()) {
    return 'light';
  }

  return window.matchMedia(DARK_MODE_QUERY).matches ? 'dark' : 'light';
}

/**
 * Hook to detect and track system theme preference
 *
 * @returns The current system theme preference ('light' or 'dark')
 *
 * @example
 * ```tsx
 * const systemTheme = useSystemThemePreference();
 * console.log(`System prefers ${systemTheme} mode`);
 * ```
 */
export function useSystemThemePreference(): SystemTheme {
  const [systemTheme, setSystemTheme] = useState<SystemTheme>(getSystemTheme);

  useEffect(() => {
    // Check if matchMedia is available
    if (!isMatchMediaAvailable()) {
      return;
    }

    let mediaQuery: MediaQueryList | null = null;
    let handleChange: ((event: MediaQueryListEvent) => void) | null = null;

    try {
      mediaQuery = window.matchMedia(DARK_MODE_QUERY);

      // Handler for media query changes
      handleChange = (event: MediaQueryListEvent) => {
        try {
          setSystemTheme(event.matches ? 'dark' : 'light');
        } catch (error) {
          // Handle errors in state update (shouldn't happen, but be safe)
          if (import.meta.env.DEV) {
            console.warn('Error updating system theme preference:', error);
          }
        }
      };

      // Modern browsers use addEventListener
      // Older browsers use addListener (deprecated but needed for Safari < 14)
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
      } else if (mediaQuery.addListener) {
        // Fallback for older browsers
        mediaQuery.addListener(handleChange);
      }
    } catch (error) {
      // Handle matchMedia failures gracefully
      if (import.meta.env.DEV) {
        console.warn('Failed to set up system theme preference listener:', error);
      }
      // Keep current theme (defaults to light from initial state)
    }

    // Cleanup listener on unmount
    return () => {
      if (mediaQuery && handleChange) {
        try {
          if (mediaQuery.removeEventListener) {
            mediaQuery.removeEventListener('change', handleChange);
          } else if (mediaQuery.removeListener) {
            // Fallback for older browsers
            mediaQuery.removeListener(handleChange);
          }
        } catch (error) {
          // Handle cleanup errors gracefully
          if (import.meta.env.DEV) {
            console.warn('Error cleaning up system theme preference listener:', error);
          }
        }
      }
    };
  }, []);

  return systemTheme;
}
