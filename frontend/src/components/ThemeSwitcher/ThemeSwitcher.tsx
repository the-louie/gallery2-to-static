/**
 * Theme Switcher Component
 *
 * @deprecated This component is deprecated. Use ThemeDropdown instead.
 * An accessible button that allows users to cycle through themes: light → dark → light
 *
 * ## Features
 *
 * - Two theme modes: light and dark
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
 * Get the next theme in the cycle
 * @param current - Current theme
 * @returns Next theme in cycle
 */
function getNextTheme(current: Theme): Theme {
  return current === 'light' ? 'dark' : 'light';
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
      return 'Theme: Dark mode. Click to switch to light mode.';
    default:
      return 'Toggle theme';
  }
}

/**
 * Sun icon for light mode
 */
function SunIcon(): React.ReactElement {
  return (
    <svg
      className="theme-switcher-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

/**
 * Moon icon for dark mode
 */
function MoonIcon(): React.ReactElement {
  return (
    <svg
      className="theme-switcher-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/**
 * Auto/System icon for system preference mode
 */
function SystemIcon(): React.ReactElement {
  return (
    <svg
      className="theme-switcher-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

/**
 * Theme Switcher Component
 *
 * @deprecated Use ThemeDropdown instead. This component is kept for backward compatibility.
 * Button that cycles through themes: light → dark → light
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

  const renderIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon />;
      case 'dark':
        return <MoonIcon />;
      default:
        return <SunIcon />;
    }
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
      {renderIcon()}
      <span className="theme-switcher-label">{theme}</span>
    </button>
  );
}

export default ThemeSwitcher;
