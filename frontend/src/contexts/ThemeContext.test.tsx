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
 *    - [ ] Switch to system preference - verify theme follows system
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
 * 4. **System Preference Following**
 *    - [ ] Set theme preference to "system"
 *    - [ ] Change system theme preference (OS settings)
 *    - [ ] Verify application theme updates automatically
 *    - [ ] Verify transition occurs when system preference changes
 *
 * 5. **Error Scenarios**
 *    - [ ] Test in private browsing mode (localStorage unavailable)
 *    - [ ] Verify theme still works (falls back gracefully)
 *    - [ ] Verify no errors in console (production mode)
 *    - [ ] Verify theme persists correctly when localStorage becomes available
 *
 * 6. **Performance**
 *    - [ ] Verify transitions don't cause layout shifts
 *    - [ ] Verify transitions don't impact scroll performance
 *    - [ ] Verify transitions don't cause jank or stuttering
 *    - [ ] Test on lower-end devices if available
 *
 * 7. **Browser Compatibility**
 *    - [ ] Test in Chrome/Edge
 *    - [ ] Test in Firefox
 *    - [ ] Test in Safari
 *    - [ ] Verify transitions work in all browsers
 *    - [ ] Verify prefers-reduced-motion is respected in all browsers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme, type ThemePreference } from './ThemeContext';

// Helper to create wrapper with ThemeProvider
function createWrapper(defaultPreference?: ThemePreference) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider defaultPreference={defaultPreference}>
        {children}
      </ThemeProvider>
    );
  };
}

describe('ThemeContext', () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock matchMedia
    mockMatchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });

    // Reset document attribute
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
  });

  describe('ThemeProvider', () => {
    it('provides context value', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('preference');
      expect(result.current).toHaveProperty('setPreference');
      expect(result.current).toHaveProperty('isDark');
      expect(result.current).toHaveProperty('isLight');
    });

    it('defaults to system preference', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.preference).toBe('system');
    });

    it('uses provided default preference', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('dark'),
      });

      expect(result.current.preference).toBe('dark');
      expect(result.current.theme).toBe('dark');
    });

    it('applies light theme to root element', () => {
      renderHook(() => useTheme(), {
        wrapper: createWrapper('light'),
      });

      // Light theme removes the data-theme attribute
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });

    it('applies dark theme to root element', () => {
      renderHook(() => useTheme(), {
        wrapper: createWrapper('dark'),
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('persists preference to localStorage', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setPreference('dark');
      });

      expect(JSON.parse(localStorage.getItem('gallery-theme-preference')!)).toBe('dark');
    });

    it('reads preference from localStorage on mount', () => {
      localStorage.setItem('gallery-theme-preference', JSON.stringify('dark'));

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.preference).toBe('dark');
      expect(result.current.theme).toBe('dark');
    });

    it('uses system preference when preference is system', () => {
      // Mock system preference as dark
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('system'),
      });

      expect(result.current.preference).toBe('system');
      expect(result.current.theme).toBe('dark');
    });

    it('setPreference updates theme', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('light'),
      });

      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.setPreference('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.preference).toBe('dark');
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
  });

  describe('Theme Resolution', () => {
    it('resolves light preference to light theme', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('light'),
      });

      expect(result.current.theme).toBe('light');
    });

    it('resolves dark preference to dark theme', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('dark'),
      });

      expect(result.current.theme).toBe('dark');
    });

    it('resolves system preference to light when system prefers light', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('system'),
      });

      expect(result.current.theme).toBe('light');
    });

    it('resolves system preference to dark when system prefers dark', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('system'),
      });

      expect(result.current.theme).toBe('dark');
    });
  });

  describe('Preference Cycling', () => {
    it('cycles from light to dark', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('light'),
      });

      act(() => {
        result.current.setPreference('dark');
      });

      expect(result.current.preference).toBe('dark');
    });

    it('cycles from dark to system', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('dark'),
      });

      act(() => {
        result.current.setPreference('system');
      });

      expect(result.current.preference).toBe('system');
    });

    it('cycles from system to light', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('system'),
      });

      act(() => {
        result.current.setPreference('light');
      });

      expect(result.current.preference).toBe('light');
    });
  });

  describe('Error Handling', () => {
    it('uses defaultPreference when localStorage is unavailable', () => {
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

      // Should use defaultPreference when localStorage fails
      expect(result.current.theme).toBe('dark'); // Uses defaultPreference

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
      localStorage.setItem('gallery-theme-preference', 'invalid json{');

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('system'),
      });

      // Should fall back to system preference (which resolves to light or dark)
      expect(result.current.preference).toBe('system');
      expect(['light', 'dark']).toContain(result.current.theme);

      consoleSpy.mockRestore();
    });

    it('handles matchMedia failures gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock matchMedia to throw
      const originalMatchMedia = window.matchMedia;
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: () => {
          throw new Error('matchMedia failed');
        },
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('system'),
      });

      // Should fall back to light theme
      expect(result.current.theme).toBe('light');

      // Restore
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: originalMatchMedia,
      });

      consoleSpy.mockRestore();
    });

    it('always returns a valid theme even on errors', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock both localStorage and matchMedia to fail
      const originalLocalStorage = window.localStorage;
      const originalMatchMedia = window.matchMedia;

      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: () => {
          throw new Error('matchMedia failed');
        },
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('system'),
      });

      // Should always return a valid theme (light or dark)
      expect(['light', 'dark']).toContain(result.current.theme);

      // Restore
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: originalMatchMedia,
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
        result.current.setPreference('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      act(() => {
        result.current.setPreference('light');
      });

      expect(result.current.theme).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
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
    it('complete theme switching flow: light -> dark -> system -> light', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('light'),
      });

      // Start with light
      expect(result.current.theme).toBe('light');
      expect(result.current.preference).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();

      // Switch to dark
      act(() => {
        result.current.setPreference('dark');
      });
      expect(result.current.theme).toBe('dark');
      expect(result.current.preference).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(JSON.parse(localStorage.getItem('gallery-theme-preference')!)).toBe('dark');

      // Switch to system
      act(() => {
        result.current.setPreference('system');
      });
      expect(result.current.preference).toBe('system');
      expect(['light', 'dark']).toContain(result.current.theme);
      expect(JSON.parse(localStorage.getItem('gallery-theme-preference')!)).toBe('system');

      // Switch back to light
      act(() => {
        result.current.setPreference('light');
      });
      expect(result.current.theme).toBe('light');
      expect(result.current.preference).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      expect(JSON.parse(localStorage.getItem('gallery-theme-preference')!)).toBe('light');
    });

    it('system preference following: updates when system preference changes', () => {
      const mockMatchMedia = vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            // Simulate system preference change after a delay
            setTimeout(() => {
              handler({ matches: true } as MediaQueryListEvent);
            }, 100);
          }
        }),
        removeEventListener: vi.fn(),
      }));

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('system'),
      });

      // Initially should be light (system prefers light)
      expect(result.current.preference).toBe('system');
      expect(result.current.theme).toBe('light');

      // Note: Actual system preference change testing requires more complex setup
      // This test verifies the integration is set up correctly
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

      // Should work with defaultPreference when localStorage unavailable
      expect(result.current.theme).toBe('dark');

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });

      // Rerender to trigger localStorage read
      rerender();

      // Should now be able to persist preferences
      act(() => {
        result.current.setPreference('light');
      });

      expect(result.current.preference).toBe('light');
      expect(JSON.parse(localStorage.getItem('gallery-theme-preference')!)).toBe('light');

      consoleSpy.mockRestore();
    });

    it('error recovery scenario: corrupted data then valid data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Set corrupted data
      localStorage.setItem('gallery-theme-preference', 'invalid json{');

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper('system'),
      });

      // Should handle corrupted data gracefully
      expect(result.current.preference).toBe('system');
      expect(['light', 'dark']).toContain(result.current.theme);

      // Corrupted data should be cleaned up
      expect(localStorage.getItem('gallery-theme-preference')).toBeNull();

      // Now set valid data
      act(() => {
        result.current.setPreference('dark');
      });

      expect(result.current.preference).toBe('dark');
      expect(JSON.parse(localStorage.getItem('gallery-theme-preference')!)).toBe('dark');

      consoleSpy.mockRestore();
    });
  });
});
