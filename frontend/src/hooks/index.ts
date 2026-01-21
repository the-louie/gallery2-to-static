/**
 * Hooks Index
 *
 * Central export file for all custom React hooks.
 */

// Theme-related hooks
export { useLocalStorage } from './useLocalStorage';
export { useSystemThemePreference } from './useSystemThemePreference';
export type { SystemTheme } from './useSystemThemePreference';

// Data hooks
export { useAlbumData } from './useAlbumData';
export type { UseAlbumDataReturn } from './useAlbumData';

// Navigation hooks
export { useBreadcrumbPath } from './useBreadcrumbPath';
export { useImageNavigation } from './useImageNavigation';

// Image hooks
export { useImagePreload } from './useImagePreload';
export { useImageZoom } from './useImageZoom';

// Lightbox hooks
export { useLightbox } from './useLightbox';
