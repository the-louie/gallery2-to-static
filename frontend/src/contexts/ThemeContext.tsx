/**
 * Theme Context
 *
 * Provides theme state management for the application. Supports light, dark,
 * and system-following themes with localStorage persistence.
 *
 * ## Features
 *
 * - Light/Dark theme support
 * - System preference detection and following
 * - localStorage persistence of user preference
 * - Memoized context value to prevent unnecessary re-renders
 * - TypeScript type safety
 *
 * ## Theme Resolution
 *
 * The theme is resolved based on user preference:
 * - 'light': Always use light theme
 * - 'dark': Always use dark theme
 * - 'system': Follow the operating system's preference
 *
 * ## Usage
 *
 * ```tsx
 * // In your app entry point
 * import { ThemeProvider } from './contexts/ThemeContext';
 *
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 *
 * // In any component
 * import { useTheme } from './contexts/ThemeContext';
 *
 * function ThemeButton() {
 *   const { theme, preference, setPreference, isDark } = useTheme();
 *
 *   return (
 *     <button onClick={() => setPreference(isDark ? 'light' : 'dark')}>
 *       Switch to {isDark ? 'light' : 'dark'} mode
 *     </button>
 *   );
 * }
 * ```
 */

import React, { createContext, useContext, useMemo, useEffect, useLayoutEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSystemThemePreference } from '../hooks/useSystemThemePreference';

/** Resolved theme value (what's actually displayed) */
export type Theme = 'light' | 'dark';

/** User's theme preference including 'system' option */
export type ThemePreference = 'light' | 'dark' | 'system';

/** localStorage key for theme preference */
const THEME_STORAGE_KEY = 'gallery-theme-preference';

/**
 * Theme context value interface
 */
export interface ThemeContextValue {
  /** The resolved theme currently being displayed */
  theme: Theme;
  /** The user's theme preference */
  preference: ThemePreference;
  /** Function to update the theme preference */
  setPreference: (preference: ThemePreference) => void;
  /** Convenience property: true if current theme is dark */
  isDark: boolean;
  /** Convenience property: true if current theme is light */
  isLight: boolean;
}

/**
 * Default context value (used when outside provider)
 */
const defaultContextValue: ThemeContextValue = {
  theme: 'light',
  preference: 'system',
  setPreference: () => {
    console.warn('ThemeProvider not found. Make sure your component is wrapped in ThemeProvider.');
  },
  isDark: false,
  isLight: true,
};

/**
 * Theme Context
 */
const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);
ThemeContext.displayName = 'ThemeContext';

/**
 * Props for ThemeProvider component
 */
export interface ThemeProviderProps {
  /** Child components */
  children: React.ReactNode;
  /** Default preference when no stored preference exists */
  defaultPreference?: ThemePreference;
}

/**
 * Apply theme to document root element
 * @param theme - The theme to apply
 */
function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
}

/**
 * Get initial theme from localStorage or system preference to prevent FOUC
 * This is called synchronously before render
 */
function getInitialTheme(defaultPreference: ThemePreference): Theme {
  let storedPreference: ThemePreference | null = null;

  // Try to read from localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        const preference = JSON.parse(stored) as ThemePreference;
        if (preference === 'dark') return 'dark';
        if (preference === 'light') return 'light';
        if (preference === 'system') {
          storedPreference = 'system';
        }
      }
    } catch {
      // Ignore errors, fall through to default
    }
  }

  // Check system preference if stored preference is 'system' OR
  // (no stored preference AND default is 'system')
  const shouldUseSystemPreference =
    storedPreference === 'system' ||
    (storedPreference === null && defaultPreference === 'system');

  if (shouldUseSystemPreference && typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Return default preference (if not 'system')
  return defaultPreference === 'dark' ? 'dark' : 'light';
}

/**
 * Theme Provider Component
 *
 * Wraps your application to provide theme context. Handles theme persistence
 * and system preference detection.
 *
 * @param props - Component props
 * @returns Provider component
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultPreference="system">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  children,
  defaultPreference = 'system',
}: ThemeProviderProps): React.ReactElement {
  // User's stored preference
  const [preference, setPreference] = useLocalStorage<ThemePreference>(
    THEME_STORAGE_KEY,
    defaultPreference
  );

  // System's current preference
  const systemTheme = useSystemThemePreference();

  // Resolve the actual theme based on preference
  const theme: Theme = useMemo(() => {
    if (preference === 'system') {
      return systemTheme;
    }
    return preference;
  }, [preference, systemTheme]);

  // Apply theme to DOM immediately (before paint) using useLayoutEffect
  // This helps prevent FOUC
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Also apply on initial mount synchronously
  // This handles the case where useLayoutEffect might be too late
  useEffect(() => {
    const initialTheme = getInitialTheme(defaultPreference);
    applyTheme(initialTheme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      preference,
      setPreference,
      isDark: theme === 'dark',
      isLight: theme === 'light',
    }),
    [theme, preference, setPreference]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 *
 * Must be used within a ThemeProvider. Throws an error if used outside.
 *
 * @returns Theme context value
 * @throws Error if used outside ThemeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, setPreference, isDark } = useTheme();
 *
 *   return (
 *     <div className={isDark ? 'dark-mode' : 'light-mode'}>
 *       Current theme: {theme}
 *       <button onClick={() => setPreference('dark')}>Dark</button>
 *       <button onClick={() => setPreference('light')}>Light</button>
 *       <button onClick={() => setPreference('system')}>System</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  // The context will always have a value (either from provider or default)
  // but we can check if setPreference is the warning function
  if (context.setPreference === defaultContextValue.setPreference) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

// Export context for advanced use cases (like testing)
export { ThemeContext };
