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

// Scroll position hooks
export { useScrollPosition } from './useScrollPosition';
export type { UseScrollPositionReturn } from './useScrollPosition';

// Navigation hooks
export { useBreadcrumbPath } from './useBreadcrumbPath';
export { useImageNavigation } from './useImageNavigation';

// Image hooks
export { useImagePreload } from './useImagePreload';
export { useImageZoom } from './useImageZoom';
export { useImageCache } from './useImageCache';
export type { UseImageCacheReturn } from './useImageCache';

// Lightbox hooks
export { useLightbox } from './useLightbox';

// Search hooks
export { useSearch } from './useSearch';
export type { UseSearchReturn } from './useSearch';
