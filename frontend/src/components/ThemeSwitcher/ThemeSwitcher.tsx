/**
 * Theme Switcher Component
 *
 * @deprecated This component is deprecated. Use ThemeDropdown instead.
 * An accessible button that cycles through themes: light → dark → classic → light.
 *
 * ## Features
 *
 * - Cycles through light, dark, and classic themes; ThemeDropdown is preferred for direct selection
 * - Accessible with proper ARIA attributes
 * - Keyboard navigable (Enter, Space)
 * - Visual icons for each mode
 *
 * ## Accessibility
 *
 * - Uses native button element for built-in accessibility
 * - Dynamic aria-label describes current state and action
 * - Focus indicator meets WCAG 2.1 AA requirements
 * - Icons have aria-hidden="true" as they are decorative
 *
 * ## Usage
 *
 * ```tsx
 * import { ThemeSwitcher } from './components/ThemeSwitcher';
 *
 * function Header() {
 *   return (
 *     <header>
 *       <h1>My App</h1>
 *       <ThemeSwitcher />
 *     </header>
 *   );
 * }
 * ```
 */

import React from 'react';
import { getThemeIcon } from '@/components/ThemeIcons';
import { useTheme, type Theme } from '../../contexts/ThemeContext';
import './ThemeSwitcher.css';

/**
 * Props for ThemeSwitcher component
 */
export interface ThemeSwitcherProps {
  /** Optional CSS class name */
  className?: string;
}

/**
 * Get the next theme in the cycle (light → dark → classic → light)
 * @param current - Current theme
 * @returns Next theme in cycle
 */
function getNextTheme(current: Theme): Theme {
  switch (current) {
    case 'light':
      return 'dark';
    case 'dark':
      return 'classic';
    case 'classic':
      return 'light';
    default:
      return 'light';
  }
}

/**
 * Get aria-label for the button based on current theme
 * @param theme - Current theme
 * @returns Descriptive label for screen readers
 */
function getAriaLabel(theme: Theme): string {
  switch (theme) {
    case 'light':
      return 'Theme: Light mode. Click to switch to dark mode.';
    case 'dark':
      return 'Theme: Dark mode. Click to switch to classic mode.';
    case 'classic':
      return 'Theme: Classic mode. Click to switch to light mode.';
    default:
      return 'Toggle theme';
  }
}

/**
 * Theme Switcher Component
 *
 * @deprecated Use ThemeDropdown instead. This component is kept for backward compatibility.
 * Button that cycles through themes: light → dark → classic → light
 *
 * @param props - Component props
 * @returns Theme switcher button
 *
 * @example
 * ```tsx
 * <ThemeSwitcher />
 * <ThemeSwitcher className="custom-class" />
 * ```
 */
export function ThemeSwitcher({ className }: ThemeSwitcherProps): React.ReactElement {
  const { theme, setTheme } = useTheme();

  const handleClick = () => {
    setTheme(getNextTheme(theme));
  };

  const buttonClassName = className
    ? `theme-switcher ${className}`
    : 'theme-switcher';

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={handleClick}
      aria-label={getAriaLabel(theme)}
      title={`Theme: ${theme}`}
    >
      {getThemeIcon(theme, 'theme-switcher-icon')}
      <span className="theme-switcher-label">{theme}</span>
    </button>
  );
}

export default ThemeSwitcher;
