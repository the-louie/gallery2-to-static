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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons';
import { getThemeIcon } from '@/components/ThemeIcons';
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
        {currentTheme && getThemeIcon(currentTheme.name, 'theme-dropdown-icon')}
        <span className="theme-dropdown-button-label">
          {currentTheme ? currentTheme.displayName : 'Theme'}
        </span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className="theme-dropdown-arrow"
          aria-hidden
        />
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
                {getThemeIcon(themeOption.name, 'theme-dropdown-icon')}
                <span className="theme-dropdown-option-label">{themeOption.displayName}</span>
                {isSelected && (
                  <FontAwesomeIcon
                    icon={faCheck}
                    className="theme-dropdown-check"
                    aria-hidden
                  />
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
