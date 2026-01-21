/**
 * ThemeContext Tests
 *
 * Tests for the theme context, provider, and useTheme hook.
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
});
