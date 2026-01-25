/**
 * Contexts Index
 *
 * Central export file for all React contexts.
 */

// Theme context
export {
  ThemeContext,
  ThemeProvider,
  useTheme,
} from './ThemeContext';

export type {
  Theme,
  ThemeContextValue,
  ThemeProviderProps,
} from './ThemeContext';

// Filter context
export {
  FilterContext,
  FilterProvider,
  useFilter,
} from './FilterContext';

export type {
  FilterContextValue,
  FilterProviderProps,
} from './FilterContext';

// View abort context (navigation-scoped AbortSignal)
export {
  ViewAbortContext,
  ViewAbortProvider,
  useViewAbortSignal,
} from './ViewAbortContext';

export type { ViewAbortContextValue, ViewAbortProviderProps } from './ViewAbortContext';

// Image config context (base URL for image assets)
export {
  ImageConfigProvider,
  useImageBaseUrl,
} from './ImageConfigContext';

export type {
  ImageConfigContextValue,
  ImageConfigProviderProps,
} from './ImageConfigContext';
