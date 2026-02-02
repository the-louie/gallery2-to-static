/**
 * Shared theme icons (Font Awesome free) used by ThemeSwitcher and ThemeDropdown.
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faPersonCane } from '@fortawesome/free-solid-svg-icons';
import type { ThemeName } from '@/config/themes';

export function SunIcon({ className }: { className: string }): React.ReactElement {
  return (
    <FontAwesomeIcon icon={faSun} className={className} aria-hidden />
  );
}

export function MoonIcon({ className }: { className: string }): React.ReactElement {
  return (
    <FontAwesomeIcon icon={faMoon} className={className} aria-hidden />
  );
}

export function ClassicIcon({ className }: { className: string }): React.ReactElement {
  return (
    <FontAwesomeIcon icon={faPersonCane} className={className} aria-hidden />
  );
}

/** Get icon for a theme by name */
export function getThemeIcon(themeName: ThemeName, className: string): React.ReactElement {
  switch (themeName) {
    case 'light':
      return <SunIcon className={className} />;
    case 'dark':
      return <MoonIcon className={className} />;
    case 'classic':
      return <ClassicIcon className={className} />;
    default:
      return <SunIcon className={className} />;
  }
}
