/**
 * Theme Context
 *
 * Provides theme state management for the application. Supports multiple themes
 * with localStorage persistence and automatic migration from the old preference-based system.
 *
 * ## Features
 *
 * - Multiple theme support (light, dark, original, and extensible for future themes)
 * - localStorage persistence of user theme selection
 * - Automatic migration from old preference-based system
 * - Robust error handling with graceful fallbacks
 * - Smooth theme transitions (CSS)
 * - Memoized context value to prevent unnecessary re-renders
 * - TypeScript type safety
 * - FOUC (Flash of Unstyled Content) prevention
 * - Theme validation (ensures selected theme exists in registry)
 *
 * ## Theme Selection
 *
 * Users can select from available themes defined in the theme registry.
 * The default theme is 'original'. Themes are applied via the data-theme attribute
 * on the document element.
 *
 * ## Error Handling
 *
 * The theme system handles errors gracefully:
 * - localStorage failures: Falls back to default theme
 * - Invalid theme names: Falls back to default theme
 * - Corrupted data: Automatically cleaned up and migrated
 * - Always returns a valid theme from the registry
 * - Errors are logged in development mode only
 *
 * ## Migration
 *
 * The system automatically migrates from the old preference-based system:
 * - 'light' preference → 'light' theme
 * - 'dark' preference → 'dark' theme
 * - 'system' preference → default theme (original)
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
 *   const { theme, setTheme, availableThemes } = useTheme();
 *
 *   return (
 *     <div>
 *       <p>Current theme: {theme}</p>
 *       {availableThemes.map((t) => (
 *         <button key={t.name} onClick={() => setTheme(t.name)}>
 *           {t.displayName}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useLayoutEffect,
  useEffect,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  type ThemeName,
  DEFAULT_THEME,
  getAllThemes,
  isValidTheme,
} from '../config/themes';
import {
  loadAlbumThemesConfig,
  getAlbumIdFromPath,
  getThemeForAlbum,
} from '../utils/albumThemesConfig';

/** Theme type (exported for convenience) */
export type Theme = ThemeName;

/** localStorage key for theme */
const THEME_STORAGE_KEY = 'gallery-theme';

/** Old localStorage key for migration */
const OLD_THEME_STORAGE_KEY = 'gallery-theme-preference';

/** Migration flag key */
const MIGRATION_FLAG_KEY = 'gallery-theme-migrated';

/**
 * Theme context value interface
 */
export interface ThemeContextValue {
  /** User's stored theme preference (for ThemeDropdown) */
  theme: Theme;
  /** Theme actually applied (considering per-album overrides) */
  effectiveTheme: Theme;
  /** Function to update the theme */
  setTheme: (theme: ThemeName) => void;
  /** Array of all available themes */
  availableThemes: ReturnType<typeof getAllThemes>;
  /** Convenience property: true if effective theme is dark */
  isDark: boolean;
  /** Convenience property: true if effective theme is light */
  isLight: boolean;
  /** Convenience property: true if effective theme is original (G2 Classic) */
  isOriginal: boolean;
}

/**
 * Default context value (used when outside provider)
 */
const defaultContextValue: ThemeContextValue = {
  theme: DEFAULT_THEME,
  effectiveTheme: DEFAULT_THEME,
  setTheme: () => {
    if (import.meta.env.DEV) {
      console.warn('ThemeProvider not found. Make sure your component is wrapped in ThemeProvider.');
    }
  },
  availableThemes: getAllThemes(),
  isDark: false,
  isLight: false,
  isOriginal: true,
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
  /** Default theme when no stored theme exists */
  defaultTheme?: ThemeName;
}

/**
 * Apply theme to document root element
 * @param theme - The theme name to apply
 *
 * Error handling:
 * - Handles cases where document is not available (SSR)
 * - Always applies a valid theme from registry
 */
function applyTheme(theme: ThemeName): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    try {
      // Apply theme via data-theme attribute
      // [data-theme="light"], [data-theme="dark"], or [data-theme="original"]
      document.documentElement.setAttribute('data-theme', theme);
    } catch (error) {
      // Handle edge cases where attribute manipulation fails
      if (import.meta.env.DEV) {
        console.warn('Failed to apply theme to document element:', error);
      }
    }
  }
}

/**
 * Migrate from old preference-based system to new theme-based system
 *
 * Migration rules:
 * - 'light' preference → 'light' theme
 * - 'dark' preference → 'dark' theme
 * - 'system' preference → default theme (original)
 * - Invalid/corrupted data → default theme (original)
 *
 * This function performs the migration synchronously and stores the result
 * in the new localStorage key, so useLocalStorage can read it immediately.
 *
 * @returns true if migration was performed, false otherwise
 */
function migrateThemePreference(): boolean {
  // Check if migration has already been done
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const migrationFlag = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrationFlag === 'true') {
      // Migration already completed
      return false;
    }

    // Check for old preference key
    const oldPreference = localStorage.getItem(OLD_THEME_STORAGE_KEY);
    if (!oldPreference) {
      // No old data to migrate
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return false;
    }

    let migratedTheme: ThemeName = DEFAULT_THEME;

    try {
      const preference = JSON.parse(oldPreference) as string;
      if (preference === 'light' || preference === 'dark') {
        // Validate theme exists in registry
        if (isValidTheme(preference)) {
          migratedTheme = preference;
        }
      }
      // 'system' and any other values default to DEFAULT_THEME
    } catch (error) {
      // Corrupted data, use default
      if (import.meta.env.DEV) {
        console.warn('Error parsing old theme preference during migration:', error);
      }
    }

    // Store migrated theme in new key
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(migratedTheme));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Error storing migrated theme:', error);
      }
    }

    // Remove old preference
    try {
      localStorage.removeItem(OLD_THEME_STORAGE_KEY);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Error removing old theme preference:', error);
      }
    }

    // Set migration flag
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');

    return true;
  } catch (error) {
    // Migration failed, but don't block app startup
    if (import.meta.env.DEV) {
      console.warn('Error during theme migration:', error);
    }
    return false;
  }
}

/**
 * Theme Provider Component
 *
 * Wraps your application to provide theme context. Handles theme persistence,
 * migration from old system, and theme validation.
 *
 * @param props - Component props
 * @returns Provider component
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultTheme="original">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
}: ThemeProviderProps): React.ReactElement {
  // Perform migration synchronously before reading from localStorage
  // This ensures migration happens before useLocalStorage reads the value
  React.useMemo(() => {
    migrateThemePreference();
  }, []);

  // Determine initial theme: stored theme or default
  // Migration has already stored the theme in the new key if needed
  const getInitialTheme = React.useCallback((): ThemeName => {
    // Try to read from localStorage (migration may have just stored a value)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as string;
          if (isValidTheme(parsed)) {
            return parsed;
          }
        }
      } catch (error) {
        // Invalid stored theme, use default
        if (import.meta.env.DEV) {
          console.warn('Error reading stored theme, using default:', error);
        }
      }
    }

    // Validate default theme
    if (isValidTheme(defaultTheme)) {
      return defaultTheme;
    }

    // Fallback to DEFAULT_THEME
    return DEFAULT_THEME;
  }, [defaultTheme]);

  // User's stored theme
  const [theme, setThemeState] = useLocalStorage<ThemeName>(
    THEME_STORAGE_KEY,
    getInitialTheme()
  );

  // Validate and normalize theme
  const validatedTheme: ThemeName = useMemo(() => {
    if (isValidTheme(theme)) {
      return theme;
    }
    // Invalid theme, fallback to default
    if (import.meta.env.DEV) {
      console.warn(`Invalid theme "${theme}", falling back to "${DEFAULT_THEME}"`);
    }
    return DEFAULT_THEME;
  }, [theme]);

  // Update stored theme if it was invalid
  useLayoutEffect(() => {
    if (theme !== validatedTheme) {
      setThemeState(validatedTheme);
    }
  }, [theme, validatedTheme, setThemeState]);

  // Per-album theme override from album-themes.json
  const location = useLocation();
  const albumId = useMemo(
    () => getAlbumIdFromPath(location.pathname),
    [location.pathname],
  );
  const [albumOverrideTheme, setAlbumOverrideTheme] = useState<ThemeName | null>(
    null,
  );

  useEffect(() => {
    if (albumId === null) {
      setAlbumOverrideTheme(null);
      return;
    }
    let cancelled = false;
    loadAlbumThemesConfig().then((config) => {
      if (!cancelled) {
        setAlbumOverrideTheme(getThemeForAlbum(albumId, config));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [albumId]);

  const effectiveTheme: ThemeName =
    albumId === null
      ? validatedTheme
      : (albumOverrideTheme ?? validatedTheme);

  // Apply theme to DOM immediately (before paint) using useLayoutEffect
  // This helps prevent FOUC
  useLayoutEffect(() => {
    applyTheme(effectiveTheme);
  }, [effectiveTheme]);

  // Wrapper for setTheme that validates theme name
  const setTheme = React.useCallback(
    (newTheme: ThemeName) => {
      if (isValidTheme(newTheme)) {
        setThemeState(newTheme);
      } else {
        if (import.meta.env.DEV) {
          console.warn(`Invalid theme name "${newTheme}", ignoring.`);
        }
      }
    },
    [setThemeState]
  );

  // Get all available themes
  const availableThemes = useMemo(() => getAllThemes(), []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme: validatedTheme,
      effectiveTheme,
      setTheme,
      availableThemes,
      isDark: effectiveTheme === 'dark',
      isLight: effectiveTheme === 'light',
      isOriginal: effectiveTheme === 'original',
    }),
    [validatedTheme, effectiveTheme, setTheme, availableThemes]
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
 *   const { theme, setTheme, availableThemes, isDark } = useTheme();
 *
 *   return (
 *     <div className={isDark ? 'dark-mode' : 'light-mode'}>
 *       Current theme: {theme}
 *       {availableThemes.map((t) => (
 *         <button key={t.name} onClick={() => setTheme(t.name)}>
 *           {t.displayName}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  // The context will always have a value (either from provider or default)
  // but we can check if setTheme is the warning function
  if (context.setTheme === defaultContextValue.setTheme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

// Export context for advanced use cases (like testing)
export { ThemeContext };
