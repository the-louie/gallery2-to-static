/**
 * View Mode Context
 *
 * Provides view mode state management for the application. Supports grid and list
 * views for albums and images with localStorage persistence.
 *
 * ## Features
 *
 * - Grid/List view support for albums
 * - Grid/List view support for images
 * - Separate preferences for albums and images
 * - localStorage persistence of user preferences
 * - Robust error handling with graceful fallbacks
 * - Memoized context value to prevent unnecessary re-renders
 * - TypeScript type safety
 *
 * ## View Mode Resolution
 *
 * The view mode is resolved based on user preference:
 * - 'grid': Display items in a grid layout
 * - 'list': Display items in a list layout
 *
 * ## Error Handling
 *
 * The view mode system handles errors gracefully:
 * - localStorage failures: Falls back to default preference ('grid')
 * - Corrupted data: Automatically cleaned up
 * - Always returns a valid view mode ('grid' or 'list')
 * - Errors are logged in development mode only
 *
 * ## Usage
 *
 * ```tsx
 * // In your app entry point
 * import { ViewModeProvider } from './contexts/ViewModeContext';
 *
 * function App() {
 *   return (
 *     <ViewModeProvider>
 *       <YourApp />
 *     </ViewModeProvider>
 *   );
 * }
 *
 * // In any component
 * import { useViewMode } from './contexts/ViewModeContext';
 *
 * function ViewModeButton() {
 *   const { albumViewMode, imageViewMode, setAlbumViewMode, setImageViewMode } = useViewMode();
 *
 *   return (
 *     <div>
 *       <button onClick={() => setAlbumViewMode(albumViewMode === 'grid' ? 'list' : 'grid')}>
 *         Albums: {albumViewMode}
 *       </button>
 *       <button onClick={() => setImageViewMode(imageViewMode === 'grid' ? 'list' : 'grid')}>
 *         Images: {imageViewMode}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { ViewMode, ViewModePreference } from '../types';

/** localStorage key for view mode preference */
const VIEW_MODE_STORAGE_KEY = 'gallery-view-mode-preference';

/**
 * View mode context value interface
 */
export interface ViewModeContextValue {
  /** Current view mode for albums */
  albumViewMode: ViewMode;
  /** Current view mode for images */
  imageViewMode: ViewMode;
  /** Function to update album view mode */
  setAlbumViewMode: (mode: ViewMode) => void;
  /** Function to update image view mode */
  setImageViewMode: (mode: ViewMode) => void;
}

/**
 * Default context value (used when outside provider)
 */
const defaultContextValue: ViewModeContextValue = {
  albumViewMode: 'grid',
  imageViewMode: 'grid',
  setAlbumViewMode: () => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('ViewModeProvider not found. Make sure your component is wrapped in ViewModeProvider.');
    }
  },
  setImageViewMode: () => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('ViewModeProvider not found. Make sure your component is wrapped in ViewModeProvider.');
    }
  },
};

/**
 * View Mode Context
 */
const ViewModeContext = createContext<ViewModeContextValue>(defaultContextValue);
ViewModeContext.displayName = 'ViewModeContext';

/**
 * Props for ViewModeProvider component
 */
export interface ViewModeProviderProps {
  /** Child components */
  children: React.ReactNode;
  /** Default preference when no stored preference exists */
  defaultPreference?: ViewModePreference;
}

/**
 * View Mode Provider Component
 *
 * Wraps your application to provide view mode context. Handles view mode persistence
 * with separate preferences for albums and images.
 *
 * @param props - Component props
 * @returns Provider component
 *
 * @example
 * ```tsx
 * <ViewModeProvider defaultPreference={{ albums: 'grid', images: 'grid' }}>
 *   <App />
 * </ViewModeProvider>
 * ```
 */
export function ViewModeProvider({
  children,
  defaultPreference = { albums: 'grid', images: 'grid' },
}: ViewModeProviderProps): React.ReactElement {
  // User's stored preference
  const [preference, setPreference] = useLocalStorage<ViewModePreference>(
    VIEW_MODE_STORAGE_KEY,
    defaultPreference
  );

  // Extract view modes from preference
  // Always ensure we have valid view modes ('grid' or 'list')
  const albumViewMode: ViewMode = useMemo(() => {
    const mode = preference.albums;
    return mode === 'list' ? 'list' : 'grid';
  }, [preference.albums]);

  const imageViewMode: ViewMode = useMemo(() => {
    const mode = preference.images;
    return mode === 'list' ? 'list' : 'grid';
  }, [preference.images]);

  // Setters that update the preference object
  const setAlbumViewMode = useCallback(
    (mode: ViewMode) => {
      setPreference((prev) => ({
        ...prev,
        albums: mode,
      }));
    },
    [setPreference]
  );

  const setImageViewMode = useCallback(
    (mode: ViewMode) => {
      setPreference((prev) => ({
        ...prev,
        images: mode,
      }));
    },
    [setPreference]
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ViewModeContextValue>(
    () => ({
      albumViewMode,
      imageViewMode,
      setAlbumViewMode,
      setImageViewMode,
    }),
    [albumViewMode, imageViewMode, setAlbumViewMode, setImageViewMode]
  );

  return (
    <ViewModeContext.Provider value={contextValue}>
      {children}
    </ViewModeContext.Provider>
  );
}

/**
 * Hook to access view mode context
 *
 * Must be used within a ViewModeProvider. Throws an error if used outside.
 *
 * @returns View mode context value
 * @throws Error if used outside ViewModeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { albumViewMode, setAlbumViewMode, imageViewMode, setImageViewMode } = useViewMode();
 *
 *   return (
 *     <div>
 *       <button onClick={() => setAlbumViewMode(albumViewMode === 'grid' ? 'list' : 'grid')}>
 *         Albums: {albumViewMode}
 *       </button>
 *       <button onClick={() => setImageViewMode(imageViewMode === 'grid' ? 'list' : 'grid')}>
 *         Images: {imageViewMode}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useViewMode(): ViewModeContextValue {
  const context = useContext(ViewModeContext);

  // The context will always have a value (either from provider or default)
  // but we can check if setAlbumViewMode is the warning function
  if (context.setAlbumViewMode === defaultContextValue.setAlbumViewMode) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }

  return context;
}

// Export context for advanced use cases (like testing)
export { ViewModeContext };
