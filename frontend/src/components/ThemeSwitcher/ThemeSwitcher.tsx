/**
 * Theme Switcher Component
 *
 * An accessible button that allows users to cycle through theme preferences:
 * light → dark → system → light
 *
 * ## Features
 *
 * - Three theme modes: light, dark, and system (follows OS preference)
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
import { useTheme, type ThemePreference } from '../../contexts/ThemeContext';
import './ThemeSwitcher.css';

/**
 * Props for ThemeSwitcher component
 */
export interface ThemeSwitcherProps {
  /** Optional CSS class name */
  className?: string;
}

/**
 * Get the next preference in the cycle
 * @param current - Current preference
 * @returns Next preference in cycle
 */
function getNextPreference(current: ThemePreference): ThemePreference {
  switch (current) {
    case 'light':
      return 'dark';
    case 'dark':
      return 'system';
    case 'system':
      return 'light';
    default:
      return 'system';
  }
}

/**
 * Get aria-label for the button based on current preference
 * @param preference - Current preference
 * @returns Descriptive label for screen readers
 */
function getAriaLabel(preference: ThemePreference): string {
  switch (preference) {
    case 'light':
      return 'Theme: Light mode. Click to switch to dark mode.';
    case 'dark':
      return 'Theme: Dark mode. Click to switch to system mode.';
    case 'system':
      return 'Theme: System mode. Click to switch to light mode.';
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
 * Button that cycles through theme preferences: light → dark → system → light
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
  const { preference, setPreference } = useTheme();

  const handleClick = () => {
    setPreference(getNextPreference(preference));
  };

  const renderIcon = () => {
    switch (preference) {
      case 'light':
        return <SunIcon />;
      case 'dark':
        return <MoonIcon />;
      case 'system':
        return <SystemIcon />;
      default:
        return <SystemIcon />;
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
      aria-label={getAriaLabel(preference)}
      title={`Theme: ${preference}`}
    >
      {renderIcon()}
      <span className="theme-switcher-label">{preference}</span>
    </button>
  );
}

export default ThemeSwitcher;
