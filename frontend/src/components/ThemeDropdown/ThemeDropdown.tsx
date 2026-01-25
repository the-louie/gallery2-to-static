/**
 * Theme Dropdown Component
 *
 * An accessible dropdown component that allows users to select from available themes.
 * Replaces the ThemeSwitcher toggle button with a dropdown menu for better scalability
 * as more themes are added.
 *
 * ## Features
 *
 * - Dropdown menu with all available themes
 * - Keyboard navigation (ArrowUp/ArrowDown, Enter, Escape, Tab)
 * - Click-outside-to-close functionality
 * - Proper ARIA attributes for accessibility
 * - Theme icons for visual identification
 * - Smooth transitions and animations
 *
 * ## Accessibility
 *
 * - Uses proper ARIA attributes (aria-label, aria-expanded, aria-haspopup, role="listbox")
 * - Full keyboard navigation support
 * - Focus management (focus trap when open, return focus to button when closed)
 * - Screen reader compatible
 * - Focus indicators meet WCAG 2.1 AA requirements
 *
 * ## Usage
 *
 * ```tsx
 * import { ThemeDropdown } from './components/ThemeDropdown';
 *
 * function Header() {
 *   return (
 *     <header>
 *       <h1>My App</h1>
 *       <ThemeDropdown />
 *     </header>
 *   );
 * }
 * ```
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeName } from '../../config/themes';
import './ThemeDropdown.css';

/**
 * Props for ThemeDropdown component
 */
export interface ThemeDropdownProps {
  /** Optional CSS class name */
  className?: string;
}

/**
 * Sun icon for light theme
 */
function SunIcon(): React.ReactElement {
  return (
    <svg
      className="theme-dropdown-icon"
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
 * Moon icon for dark theme
 */
function MoonIcon(): React.ReactElement {
  return (
    <svg
      className="theme-dropdown-icon"
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
 * Classic/frame icon for Original (G2 Classic) theme
 */
function ClassicIcon(): React.ReactElement {
  return (
    <svg
      className="theme-dropdown-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

/**
 * Get icon for a theme
 */
function getThemeIcon(themeName: ThemeName): React.ReactElement {
  switch (themeName) {
    case 'light':
      return <SunIcon />;
    case 'dark':
      return <MoonIcon />;
    case 'original':
      return <ClassicIcon />;
    default:
      return <SunIcon />;
  }
}

/**
 * Theme Dropdown Component
 *
 * Dropdown menu for selecting themes. Supports keyboard navigation and accessibility.
 *
 * @param props - Component props
 * @returns Theme dropdown component
 *
 * @example
 * ```tsx
 * <ThemeDropdown />
 * <ThemeDropdown className="custom-class" />
 * ```
 */
export function ThemeDropdown({ className }: ThemeDropdownProps): React.ReactElement {
  const { theme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Get current theme definition
  const currentTheme = availableThemes.find((t) => t.name === theme);

  // Handle edge case: no themes available (shouldn't happen, but handle gracefully)
  if (availableThemes.length === 0) {
    const buttonClassName = className
      ? `theme-dropdown-button ${className}`
      : 'theme-dropdown-button';
    return (
      <div className="theme-dropdown">
        <button
          type="button"
          className={buttonClassName}
          disabled
          aria-label="Theme selector (no themes available)"
        >
          <span className="theme-dropdown-button-label">No themes</span>
        </button>
      </div>
    );
  }

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
    // Return focus to button
    buttonRef.current?.focus();
  }, []);

  // Handle theme selection
  const handleThemeSelect = useCallback(
    (themeName: ThemeName) => {
      setTheme(themeName);
      closeDropdown();
    },
    [setTheme, closeDropdown]
  );

  // Handle button click
  const handleButtonClick = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) {
        // When closed, only Enter/Space opens dropdown
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setIsOpen(true);
          setFocusedIndex(0);
        }
        return;
      }

      // When open, handle navigation
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev < availableThemes.length - 1 ? prev + 1 : 0;
            optionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
            return next;
          });
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : availableThemes.length - 1;
            optionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
            return next;
          });
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < availableThemes.length) {
            handleThemeSelect(availableThemes[focusedIndex].name);
          }
          break;
        case 'Escape':
          event.preventDefault();
          closeDropdown();
          break;
        case 'Tab':
          closeDropdown();
          break;
        default:
          break;
      }
    },
    [isOpen, focusedIndex, availableThemes, handleThemeSelect, closeDropdown]
  );

  // Handle click outside
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  // Focus first option when opening
  // Use useLayoutEffect to ensure focus happens synchronously after DOM update
  React.useLayoutEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      const option = optionRefs.current[focusedIndex];
      if (option) {
        option.focus();
      }
    }
  }, [isOpen, focusedIndex]);

  // Get aria-label for button
  const getButtonAriaLabel = (): string => {
    return currentTheme
      ? `Theme: ${currentTheme.displayName}. Click to change theme.`
      : 'Theme selector';
  };

  const buttonClassName = className
    ? `theme-dropdown-button ${className}`
    : 'theme-dropdown-button';

  return (
    <div className="theme-dropdown">
      <button
        ref={buttonRef}
        type="button"
        className={buttonClassName}
        onClick={handleButtonClick}
        onKeyDown={handleKeyDown}
        aria-label={getButtonAriaLabel()}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title={currentTheme ? `Current theme: ${currentTheme.displayName}` : 'Select theme'}
      >
        {currentTheme && getThemeIcon(currentTheme.name)}
        <span className="theme-dropdown-button-label">
          {currentTheme ? currentTheme.displayName : 'Theme'}
        </span>
        <svg
          className="theme-dropdown-arrow"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <ul
          ref={menuRef}
          className="theme-dropdown-menu"
          role="listbox"
          aria-label="Theme options"
        >
          {availableThemes.map((themeOption, index) => {
            const isSelected = themeOption.name === theme;
            const isFocused = index === focusedIndex;
            return (
              <li
                key={themeOption.name}
                ref={(el) => {
                  // React calls ref callback with null when element is unmounted
                  if (el) {
                    optionRefs.current[index] = el;
                  } else {
                    // Clean up ref when element is unmounted
                    optionRefs.current[index] = null;
                  }
                }}
                role="option"
                aria-selected={isSelected}
                className={`theme-dropdown-option ${isSelected ? 'theme-dropdown-option-selected' : ''} ${isFocused ? 'theme-dropdown-option-focused' : ''}`}
                onClick={() => handleThemeSelect(themeOption.name)}
                onMouseEnter={() => setFocusedIndex(index)}
                tabIndex={-1}
              >
                {getThemeIcon(themeOption.name)}
                <span className="theme-dropdown-option-label">{themeOption.displayName}</span>
                {isSelected && (
                  <svg
                    className="theme-dropdown-check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ThemeDropdown;
