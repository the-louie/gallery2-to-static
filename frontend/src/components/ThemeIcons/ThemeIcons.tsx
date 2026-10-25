/**
 * Shared theme icons (Font Awesome free) used by ThemeSwitcher and ThemeDropdown.
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faPersonCane } from '@fortawesome/free-solid-svg-icons';

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
