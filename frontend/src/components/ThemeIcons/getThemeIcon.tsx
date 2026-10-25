/**
 * Theme name -> icon element. Kept apart from ThemeIcons.tsx so that file exports only components
 * (React fast refresh; react-refresh/only-export-components).
 */

import React from 'react';
import type { ThemeName } from '@/config/themes';
import { SunIcon, MoonIcon, ClassicIcon } from './ThemeIcons';

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
