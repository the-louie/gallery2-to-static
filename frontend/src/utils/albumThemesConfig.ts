/**
 * Per-album theme configuration utilities
 *
 * Loads and parses album-themes.json from the public directory.
 * Provides theme lookup for albums with fallback to default theme.
 *
 * @module frontend/src/utils/albumThemesConfig
 */

import type { AlbumThemesConfig } from '@/types/albumThemes';
import {
  type ThemeName,
  DEFAULT_THEME,
  isValidTheme,
} from '@/config/themes';

/** Default config when file is missing or invalid */
const DEFAULT_CONFIG: AlbumThemesConfig = {
  defaultTheme: DEFAULT_THEME,
  albumThemes: {},
};

let cachedConfig: AlbumThemesConfig | null = null;
let loadPromise: Promise<AlbumThemesConfig> | null = null;

/**
 * Type guard to validate parsed JSON matches AlbumThemesConfig structure.
 */
export function isValidAlbumThemesConfig(data: unknown): data is AlbumThemesConfig {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if ('defaultTheme' in obj && obj.defaultTheme !== undefined) {
    if (typeof obj.defaultTheme !== 'string') {
      return false;
    }
  }
  if ('albumThemes' in obj && obj.albumThemes !== undefined) {
    if (
      typeof obj.albumThemes !== 'object' ||
      obj.albumThemes === null ||
      Array.isArray(obj.albumThemes)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Get theme for an album from config.
 *
 * @param albumId - Album ID, or null when not viewing an album
 * @param config - Parsed album themes config
 * @returns Valid theme name (always from registry)
 */
export function getThemeForAlbum(
  albumId: number | null,
  config: AlbumThemesConfig,
): ThemeName {
  if (albumId === null) {
    return resolveDefaultTheme(config);
  }

  const albumThemes = config.albumThemes;
  if (!albumThemes || typeof albumThemes !== 'object') {
    return resolveDefaultTheme(config);
  }

  const themeName = albumThemes[String(albumId)];
  if (themeName === undefined || themeName === null) {
    return resolveDefaultTheme(config);
  }

  if (isValidTheme(themeName)) {
    return themeName;
  }

  if (import.meta.env.DEV) {
    console.warn(
      `[albumThemesConfig] Invalid theme "${themeName}" for album ${albumId}, falling back to default`,
    );
  }
  return resolveDefaultTheme(config);
}

function resolveDefaultTheme(config: AlbumThemesConfig): ThemeName {
  const defaultTheme = config.defaultTheme;
  if (defaultTheme && isValidTheme(defaultTheme)) {
    return defaultTheme;
  }
  return DEFAULT_THEME;
}

/**
 * Extract album ID from pathname.
 *
 * Matches /album/7 and /album/7/image/10. Returns null for /, /search, etc.
 * Uses same validation as parseAlbumId (positive integer).
 *
 * @param pathname - Pathname from useLocation (e.g. /album/7 or /album/7/image/10)
 * @returns Parsed album ID or null
 */
export function getAlbumIdFromPath(pathname: string): number | null {
  if (typeof pathname !== 'string' || pathname.trim() === '') {
    return null;
  }

  const match = pathname.match(/^\/album\/(\d+)(?:\/|$)/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  if (Number.isNaN(parsed) || parsed <= 0 || !Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Load album themes configuration from /album-themes.json.
 *
 * Fetches, parses, and validates. Returns default config on 404, parse error,
 * or invalid schema. Caches result for application lifetime.
 *
 * @returns Promise resolving to valid AlbumThemesConfig
 */
export async function loadAlbumThemesConfig(): Promise<AlbumThemesConfig> {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  if (loadPromise !== null) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const response = await fetch('/album-themes.json');

      if (!response.ok) {
        cachedConfig = DEFAULT_CONFIG;
        return DEFAULT_CONFIG;
      }

      let jsonData: unknown;
      try {
        jsonData = await response.json();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(
            '[albumThemesConfig] Failed to parse album-themes.json, using default:',
            error,
          );
        }
        cachedConfig = DEFAULT_CONFIG;
        return DEFAULT_CONFIG;
      }

      if (isValidAlbumThemesConfig(jsonData)) {
        const config: AlbumThemesConfig = {
          defaultTheme: jsonData.defaultTheme,
          albumThemes: jsonData.albumThemes ?? {},
        };
        cachedConfig = config;
        return config;
      }

      if (import.meta.env.DEV) {
        console.warn(
          '[albumThemesConfig] Invalid album-themes.json structure, using default',
        );
      }
      cachedConfig = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(
          '[albumThemesConfig] Failed to load album-themes.json, using default:',
          error,
        );
      }
      cachedConfig = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Clear album themes config cache.
 *
 * Useful for testing. After clearing, next loadAlbumThemesConfig() will refetch.
 */
export function clearAlbumThemesConfigCache(): void {
  cachedConfig = null;
  loadPromise = null;
}
