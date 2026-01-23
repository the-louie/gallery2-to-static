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

// View mode context
export {
  ViewModeContext,
  ViewModeProvider,
  useViewMode,
} from './ViewModeContext';

export type {
  ViewModeContextValue,
  ViewModeProviderProps,
} from './ViewModeContext';
