/**
 * Per-album theme configuration types
 *
 * Defines the structure of album-themes.json used to assign themes to specific albums.
 * Album IDs are stored as string keys (JSON keys are always strings).
 *
 * @module frontend/src/types/albumThemes
 */

/**
 * Configuration for per-album theme overrides.
 *
 * - defaultTheme: Theme used when an album has no override. Defaults to app DEFAULT_THEME.
 * - albumThemes: Map of album ID (string) to theme name. Keys must be valid positive integers as strings.
 */
export interface AlbumThemesConfig {
  /** Theme used when album has no override or when album theme is invalid */
  defaultTheme?: string;
  /** Map of album ID (as string) to theme name (e.g. "7" -> "dark") */
  albumThemes?: Record<string, string>;
}
