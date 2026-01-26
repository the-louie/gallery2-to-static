/**
 * Theme Registry Tests
 *
 * Tests for the theme registry and utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  getTheme,
  getAllThemes,
  isValidTheme,
  THEME_REGISTRY,
  DEFAULT_THEME,
  type ThemeName,
} from './themes';

describe('Theme Registry', () => {
  describe('THEME_REGISTRY', () => {
    it('contains light, dark, and original themes', () => {
      const themeNames = THEME_REGISTRY.map((theme) => theme.name);
      expect(themeNames).toContain('light');
      expect(themeNames).toContain('dark');
      expect(themeNames).toContain('original');
    });

    it('has exactly three themes', () => {
      expect(THEME_REGISTRY.length).toBe(3);
    });

    it('has unique theme names', () => {
      const names = THEME_REGISTRY.map((theme) => theme.name);
      const uniqueNames = new Set(names);
      expect(names.length).toBe(uniqueNames.size);
    });

    it('all themes have required properties', () => {
      THEME_REGISTRY.forEach((theme) => {
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('displayName');
        expect(theme).toHaveProperty('cssSelector');
        expect(typeof theme.name).toBe('string');
        expect(typeof theme.displayName).toBe('string');
        expect(typeof theme.cssSelector).toBe('string');
        expect(theme.name.length).toBeGreaterThan(0);
        expect(theme.displayName.length).toBeGreaterThan(0);
      });
    });

    it('is immutable (readonly)', () => {
      // TypeScript should prevent mutations, but we can test runtime behavior
      expect(() => {
        // @ts-expect-error - Testing immutability
        THEME_REGISTRY.push({ name: 'test', displayName: 'Test', cssSelector: '[data-theme="test"]' });
      }).toThrow();
    });
  });

  describe('getTheme', () => {
    it('returns theme definition for valid theme name', () => {
      const lightTheme = getTheme('light');
      expect(lightTheme).toBeDefined();
      expect(lightTheme?.name).toBe('light');
      expect(lightTheme?.displayName).toBe('Light');
    });

    it('returns theme definition for dark theme', () => {
      const darkTheme = getTheme('dark');
      expect(darkTheme).toBeDefined();
      expect(darkTheme?.name).toBe('dark');
      expect(darkTheme?.displayName).toBe('Dark');
    });

    it('returns theme definition for original theme', () => {
      const originalTheme = getTheme('original');
      expect(originalTheme).toBeDefined();
      expect(originalTheme?.name).toBe('original');
      expect(originalTheme?.displayName).toBe('Original');
    });

    it('returns undefined for invalid theme name', () => {
      const invalidTheme = getTheme('invalid');
      expect(invalidTheme).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      const emptyTheme = getTheme('');
      expect(emptyTheme).toBeUndefined();
    });

    it('is case-sensitive', () => {
      const upperTheme = getTheme('LIGHT');
      expect(upperTheme).toBeUndefined();
    });
  });

  describe('getAllThemes', () => {
    it('returns all themes from registry', () => {
      const themes = getAllThemes();
      expect(themes.length).toBe(THEME_REGISTRY.length);
      expect(themes).toEqual(THEME_REGISTRY);
    });

    it('maintains theme order', () => {
      const themes = getAllThemes();
      themes.forEach((theme, index) => {
        expect(theme.name).toBe(THEME_REGISTRY[index].name);
      });
    });

    it('returns readonly array', () => {
      const themes = getAllThemes();
      expect(() => {
        // @ts-expect-error - Testing immutability
        themes.push({ name: 'test', displayName: 'Test', cssSelector: '[data-theme="test"]' });
      }).toThrow();
    });
  });

  describe('isValidTheme', () => {
    it('returns true for valid theme names', () => {
      expect(isValidTheme('light')).toBe(true);
      expect(isValidTheme('dark')).toBe(true);
      expect(isValidTheme('original')).toBe(true);
    });

    it('returns false for invalid theme names', () => {
      expect(isValidTheme('invalid')).toBe(false);
      expect(isValidTheme('')).toBe(false);
      expect(isValidTheme('LIGHT')).toBe(false); // case-sensitive
    });

    it('works as type guard', () => {
      const name: string = 'light';
      if (isValidTheme(name)) {
        // TypeScript should narrow the type here
        const themeName: ThemeName = name;
        expect(themeName).toBe('light');
      }
    });
  });

  describe('DEFAULT_THEME', () => {
    it('is a valid theme name', () => {
      expect(isValidTheme(DEFAULT_THEME)).toBe(true);
    });

    it('is original theme', () => {
      expect(DEFAULT_THEME).toBe('original');
    });
  });
});
