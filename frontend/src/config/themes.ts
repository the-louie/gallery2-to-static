/**
 * Theme Registry
 *
 * Centralized configuration for available themes in the application.
 * This registry defines all themes that users can select, along with
 * their metadata and CSS selectors.
 *
 * ## Features
 *
 * - Type-safe theme definitions
 * - Immutable theme registry
 * - Utility functions for theme lookup and validation
 * - Extensible design for adding new themes
 *
 * ## Adding New Themes
 *
 * To add a new theme:
 * 1. Add a new ThemeDefinition object to THEME_REGISTRY
 * 2. Add corresponding CSS variables in themes.css using [data-theme="{name}"]
 * 3. The theme will automatically be available in the dropdown
 *
 * ## Usage
 *
 * ```tsx
 * import { getTheme, getAllThemes, isValidTheme } from '@/config/themes';
 *
 * const theme = getTheme('light');
 * const allThemes = getAllThemes();
 * const isValid = isValidTheme('dark');
 * ```
 */

/**
 * Theme definition interface
 */
export interface ThemeDefinition {
  /** Unique theme identifier (used in CSS selectors and storage) */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Optional description of the theme */
  description?: string;
  /** CSS selector for this theme (e.g., '[data-theme="light"]') */
  cssSelector: string;
}

/**
 * Theme registry - readonly array of theme definitions
 */
export const THEME_REGISTRY: readonly ThemeDefinition[] = [
  {
    name: 'light',
    displayName: 'Light',
    description: 'Light theme with bright colors',
    cssSelector: '[data-theme="light"]',
  },
  {
    name: 'dark',
    displayName: 'Dark',
    description: 'Dark theme with dark colors',
    cssSelector: '[data-theme="dark"]',
  },
] as const;

/**
 * Type for theme names - union type derived from registry
 */
export type ThemeName = (typeof THEME_REGISTRY)[number]['name'];

/**
 * Default theme name
 */
export const DEFAULT_THEME: ThemeName = 'light';

/**
 * Get theme definition by name
 *
 * @param name - Theme name to lookup
 * @returns Theme definition or undefined if not found
 *
 * @example
 * ```tsx
 * const lightTheme = getTheme('light');
 * ```
 */
export function getTheme(name: string): ThemeDefinition | undefined {
  return THEME_REGISTRY.find((theme) => theme.name === name);
}

/**
 * Get all available themes
 *
 * @returns Readonly array of all theme definitions
 *
 * @example
 * ```tsx
 * const themes = getAllThemes();
 * ```
 */
export function getAllThemes(): readonly ThemeDefinition[] {
  return THEME_REGISTRY;
}

/**
 * Check if a theme name is valid
 *
 * @param name - Theme name to validate
 * @returns true if theme exists in registry, false otherwise
 *
 * @example
 * ```tsx
 * if (isValidTheme('dark')) {
 *   setTheme('dark');
 * }
 * ```
 */
export function isValidTheme(name: string): name is ThemeName {
  return THEME_REGISTRY.some((theme) => theme.name === name);
}
