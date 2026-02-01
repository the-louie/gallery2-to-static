/**
 * ThemeContext Tests
 *
 * Tests for the theme context, provider, and useTheme hook.
 *
 * ## Manual Testing Checklist for Theme Transitions
 *
 * The following manual tests should be performed to verify theme transitions work correctly:
 *
 * 1. **Basic Theme Switching**
 *    - [ ] Switch from light to dark theme - verify smooth transition
 *    - [ ] Switch from dark to light theme - verify smooth transition
 *    - [ ] Verify no flash of unstyled content (FOUC) on page load
 *
 * 2. **Transition Smoothness**
 *    - [ ] Verify colors transition smoothly (not instant)
 *    - [ ] Verify background colors transition smoothly
 *    - [ ] Verify border colors transition smoothly
 *    - [ ] Verify text colors transition smoothly
 *    - [ ] Verify transitions complete in reasonable time (~300ms)
 *
 * 3. **Accessibility - Reduced Motion**
 *    - [ ] Enable "prefers-reduced-motion" in browser/system settings
 *    - [ ] Verify transitions are disabled when reduced motion is preferred
 *    - [ ] Verify theme still switches correctly (just without animation)
 *    - [ ] Verify no visual glitches when transitions are disabled
 *
 * 4. **Error Scenarios**
 *    - [ ] Test in private browsing mode (localStorage unavailable)
 *    - [ ] Verify theme still works (falls back gracefully)
 *    - [ ] Verify no errors in console (production mode)
 *    - [ ] Verify theme persists correctly when localStorage becomes available
 *
 * 5. **Performance**
 *    - [ ] Verify transitions don't cause layout shifts
 *    - [ ] Verify transitions don't impact scroll performance
 *    - [ ] Verify transitions don't cause jank or stuttering
 *    - [ ] Test on lower-end devices if available
 *
 * 6. **Browser Compatibility**
 *    - [ ] Test in Chrome/Edge
 *    - [ ] Test in Firefox
 *    - [ ] Test in Safari
 *    - [ ] Verify transitions work in all browsers
 *    - [ ] Verify prefers-reduced-motion is respected in all browsers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, useTheme } from './ThemeContext';
import type { ThemeName } from '../config/themes';
import * as albumThemesConfig from '../utils/albumThemesConfig';

const originalFetch = globalThis.fetch;

// Helper to create wrapper with ThemeProvider and MemoryRouter (ThemeProvider uses useLocation)
function createWrapper(
  defaultTheme?: ThemeName,
  initialEntries: string[] = ['/'],
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <ThemeProvider defaultTheme={defaultTheme}>
          {children}
        </ThemeProvider>
      </MemoryRouter>
    );
  };
}

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Clear migration flag
    localStorage.removeItem('gallery-theme-migrated');

    // Reset document attribute
    document.documentElement.removeAttribute('data-theme');

    // Clear album themes cache
    albumThemesConfig.clearAlbumThemesConfigCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
    localStorage.removeItem('gallery-theme-migrated');
    albumThemesConfig.clearAlbumThemesConfigCache();
  });

  describe('ThemeProvider', () => {
    it('provides context value', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('effectiveTheme');
      expect(result.current).toHaveProperty('setTheme');
      expect(result.current).toHaveProperty('availableThemes');
      expect(result.current).toHaveProperty('isDark');
      expect(result.current).toHaveProperty('isLight');
      expect(result.current).toHaveProperty('isOriginal');
    });

    it('defaults to original theme', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.theme).toBe('original');
    });

    it('uses provided default theme', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('dark'),
      });

      expect(result.current.theme).toBe('dark');
    });

    it('applies light theme to root element', () => {
      renderHook(() => useTheme(), {
        wrapper: createWrapper('light'),
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('applies dark theme to root element', () => {
      renderHook(() => useTheme(), {
        wrapper: createWrapper('dark'),
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('applies original theme to root element', () => {
      renderHook(() => useTheme(), {
        wrapper: createWrapper('original'),
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('original');
    });

    it('persists theme to localStorage', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(JSON.parse(localStorage.getItem('gallery-theme')!)).toBe('dark');
    });

    it('reads theme from localStorage on mount', () => {
      localStorage.setItem('gallery-theme', JSON.stringify('dark'));
      localStorage.setItem('gallery-theme-migrated', 'true');

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.theme).toBe('dark');
    });

    it('setTheme updates theme', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('light'),
      });

      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
    });

    it('provides available themes', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.availableThemes).toBeDefined();
      expect(Array.isArray(result.current.availableThemes)).toBe(true);
      expect(result.current.availableThemes.length).toBeGreaterThan(0);
      expect(result.current.availableThemes.some((t) => t.name === 'light')).toBe(true);
      expect(result.current.availableThemes.some((t) => t.name === 'dark')).toBe(true);
      expect(result.current.availableThemes.some((t) => t.name === 'original')).toBe(true);
    });

    it('effectiveTheme equals theme when on home page', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('light'),
      });

      expect(result.current.effectiveTheme).toBe('light');
      expect(result.current.theme).toBe('light');
    });

    it('effectiveTheme applies album override when on album page', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          defaultTheme: 'original',
          albumThemes: { '7': 'dark' },
        }),
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('light', ['/album/7']),
      });

      await waitFor(() => {
        expect(result.current.effectiveTheme).toBe('dark');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('effectiveTheme uses user theme on home when no album override', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          defaultTheme: 'original',
          albumThemes: {},
        }),
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('dark', ['/']),
      });

      expect(result.current.effectiveTheme).toBe('dark');
      expect(result.current.theme).toBe('dark');
    });

    it('effectiveTheme uses user theme when subalbum has no entry in album-themes.json', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          defaultTheme: 'original',
          albumThemes: {},
        }),
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('dark', ['/album/7']),
      });

      await waitFor(() => {
        expect(result.current.effectiveTheme).toBe('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('effectiveTheme falls back to defaultTheme when album has invalid theme in config', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          defaultTheme: 'light',
          albumThemes: { '7': 'invalid' },
        }),
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('dark', ['/album/7']),
      });

      await waitFor(() => {
        expect(result.current.effectiveTheme).toBe('light');
      });

      expect(result.current.theme).toBe('dark');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('useTheme', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });

    it('isDark is true when theme is dark', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('dark'),
      });

      expect(result.current.isDark).toBe(true);
      expect(result.current.isLight).toBe(false);
    });

    it('isLight is true when theme is light', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('light'),
      });

      expect(result.current.isLight).toBe(true);
      expect(result.current.isDark).toBe(false);
    });

    it('isOriginal is true when theme is original', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('original'),
      });

      expect(result.current.isOriginal).toBe(true);
      expect(result.current.isDark).toBe(false);
      expect(result.current.isLight).toBe(false);
    });
  });

  describe('Theme Validation', () => {
    it('validates theme name and falls back to default for invalid theme', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Store invalid theme
      localStorage.setItem('gallery-theme', JSON.stringify('invalid-theme'));
      localStorage.setItem('gallery-theme-migrated', 'true');

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      // Should fall back to default (original)
      expect(result.current.theme).toBe('original');

      consoleSpy.mockRestore();
    });

    it('ignores invalid theme name in setTheme', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('light'),
      });

      const initialTheme = result.current.theme;

      act(() => {
        // @ts-expect-error - Testing invalid theme name
        result.current.setTheme('invalid-theme');
      });

      // Theme should not change
      expect(result.current.theme).toBe(initialTheme);

      consoleSpy.mockRestore();
    });
  });

  describe('Migration', () => {
    it('migrates from old preference system - light', () => {
      localStorage.setItem('gallery-theme-preference', JSON.stringify('light'));

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.theme).toBe('light');
      expect(localStorage.getItem('gallery-theme-preference')).toBeNull();
      expect(localStorage.getItem('gallery-theme-migrated')).toBe('true');
      expect(JSON.parse(localStorage.getItem('gallery-theme')!)).toBe('light');
    });

    it('migrates from old preference system - dark', () => {
      localStorage.setItem('gallery-theme-preference', JSON.stringify('dark'));

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.theme).toBe('dark');
      expect(localStorage.getItem('gallery-theme-preference')).toBeNull();
      expect(localStorage.getItem('gallery-theme-migrated')).toBe('true');
      expect(JSON.parse(localStorage.getItem('gallery-theme')!)).toBe('dark');
    });

    it('migrates from old preference system - system defaults to original', () => {
      localStorage.setItem('gallery-theme-preference', JSON.stringify('system'));

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.theme).toBe('original');
      expect(localStorage.getItem('gallery-theme-preference')).toBeNull();
      expect(localStorage.getItem('gallery-theme-migrated')).toBe('true');
      expect(JSON.parse(localStorage.getItem('gallery-theme')!)).toBe('original');
    });

    it('does not migrate if already migrated', () => {
      localStorage.setItem('gallery-theme', JSON.stringify('dark'));
      localStorage.setItem('gallery-theme-migrated', 'true');
      localStorage.setItem('gallery-theme-preference', JSON.stringify('light'));

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      // Should use existing theme, not migrate
      expect(result.current.theme).toBe('dark');
      // Old preference should still exist (not migrated again)
      expect(localStorage.getItem('gallery-theme-preference')).toBeTruthy();
    });

    it('handles corrupted old preference data gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      localStorage.setItem('gallery-theme-preference', 'invalid json{');

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      // Should fall back to default
      expect(result.current.theme).toBe('original');
      expect(localStorage.getItem('gallery-theme-preference')).toBeNull();
      expect(localStorage.getItem('gallery-theme-migrated')).toBe('true');

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('uses default theme when localStorage is unavailable', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock localStorage to be unavailable
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('dark'),
      });

      // Should use defaultTheme when localStorage fails
      expect(result.current.theme).toBe('dark');

      // Restore
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });

      consoleSpy.mockRestore();
    });

    it('handles corrupted localStorage data gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Store corrupted data
      localStorage.setItem('gallery-theme', 'invalid json{');
      localStorage.setItem('gallery-theme-migrated', 'true');

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      // Should fall back to default theme
      expect(result.current.theme).toBe('original');

      consoleSpy.mockRestore();
    });

    it('always returns a valid theme even on errors', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock localStorage to fail
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      // Should always return a valid theme (light, dark, or original)
      expect(['light', 'dark', 'original']).toContain(result.current.theme);

      // Restore
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });

      consoleSpy.mockRestore();
    });

    it('handles document not available (SSR)', () => {
      const originalDocument = global.document;
      // @ts-expect-error - Testing SSR scenario
      global.document = undefined;

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('dark'),
      });

      // Should not crash, theme should still be resolved
      expect(result.current.theme).toBe('dark');

      // Restore
      global.document = originalDocument;
    });
  });

  describe('Theme Transitions', () => {
    it('applies theme changes without throwing errors', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('light'),
      });

      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('applies theme synchronously to prevent FOUC', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('dark'),
      });

      // Theme should be applied immediately
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(result.current.theme).toBe('dark');
    });
  });

  describe('Integration Tests', () => {
    it('complete theme switching flow: light -> dark -> light', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('light'),
      });

      // Start with light
      expect(result.current.theme).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      // Switch to dark
      act(() => {
        result.current.setTheme('dark');
      });
      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(JSON.parse(localStorage.getItem('gallery-theme')!)).toBe('dark');

      // Switch back to light
      act(() => {
        result.current.setTheme('light');
      });
      expect(result.current.theme).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(JSON.parse(localStorage.getItem('gallery-theme')!)).toBe('light');
    });

    it('error recovery scenario: localStorage fails then recovers', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Start with localStorage unavailable
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: createWrapper('dark'),
      });

      // Should work with defaultTheme when localStorage unavailable
      expect(result.current.theme).toBe('dark');

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });

      // Rerender to trigger localStorage read
      rerender();

      // Should now be able to persist themes
      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(JSON.parse(localStorage.getItem('gallery-theme')!)).toBe('light');

      consoleSpy.mockRestore();
    });

    it('error recovery scenario: corrupted data then valid data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Set corrupted data
      localStorage.setItem('gallery-theme', 'invalid json{');
      localStorage.setItem('gallery-theme-migrated', 'true');

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      // Should handle corrupted data gracefully
      expect(result.current.theme).toBe('original');

      // Now set valid data
      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(JSON.parse(localStorage.getItem('gallery-theme')!)).toBe('dark');

      consoleSpy.mockRestore();
    });
  });
});
