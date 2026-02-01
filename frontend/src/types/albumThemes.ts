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
 * - defaultTheme: Fallback when albumId is null or when an album's entry has an invalid theme value. Defaults to app DEFAULT_THEME. When an album has no entry in albumThemes, the app uses the user's theme, not defaultTheme.
 * - albumThemes: Map of album ID (string) to theme name. Keys must be valid positive integers as strings.
 */
export interface AlbumThemesConfig {
  /** Fallback when albumId is null or when an album's theme value is invalid; not used when album has no entry (user theme is used then) */
  defaultTheme?: string;
  /** Map of album ID (as string) to theme name (e.g. "7" -> "dark") */
  albumThemes?: Record<string, string>;
}
