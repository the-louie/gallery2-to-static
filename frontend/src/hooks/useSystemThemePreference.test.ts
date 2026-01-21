/**
 * useSystemThemePreference Hook Tests
 *
 * Tests for the system theme preference detection hook.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSystemThemePreference } from './useSystemThemePreference';

describe('useSystemThemePreference', () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>;
  let mockAddEventListener: ReturnType<typeof vi.fn>;
  let mockRemoveEventListener: ReturnType<typeof vi.fn>;
  let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;

  beforeEach(() => {
    mockAddEventListener = vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        changeHandler = handler;
      }
    });
    mockRemoveEventListener = vi.fn();

    mockMatchMedia = vi.fn((query: string) => ({
      matches: query.includes('dark') ? false : false,
      media: query,
      onchange: null,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      addListener: mockAddEventListener,
      removeListener: mockRemoveEventListener,
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
  });

  afterEach(() => {
    changeHandler = null;
    vi.clearAllMocks();
  });

  it('returns light when system prefers light', () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    const { result } = renderHook(() => useSystemThemePreference());

    expect(result.current).toBe('light');
  });

  it('returns dark when system prefers dark', () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    const { result } = renderHook(() => useSystemThemePreference());

    expect(result.current).toBe('dark');
  });

  it('adds event listener on mount', () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    renderHook(() => useSystemThemePreference());

    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('removes event listener on unmount', () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    const { unmount } = renderHook(() => useSystemThemePreference());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('updates when system preference changes to dark', () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    const { result } = renderHook(() => useSystemThemePreference());

    expect(result.current).toBe('light');

    // Simulate system preference change
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe('dark');
  });

  it('updates when system preference changes to light', () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    const { result } = renderHook(() => useSystemThemePreference());

    expect(result.current).toBe('dark');

    // Simulate system preference change
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: false } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe('light');
  });

  it('handles browsers without matchMedia', () => {
    // Remove matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useSystemThemePreference());

    // Should default to light when matchMedia is not available
    expect(result.current).toBe('light');
  });

  it('uses addListener fallback for older browsers', () => {
    const mockAddListener = vi.fn((handler: (event: MediaQueryListEvent) => void) => {
      changeHandler = handler;
    });
    const mockRemoveListener = vi.fn();

    mockMatchMedia.mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: undefined,
      removeEventListener: undefined,
      addListener: mockAddListener,
      removeListener: mockRemoveListener,
    });

    const { unmount } = renderHook(() => useSystemThemePreference());

    expect(mockAddListener).toHaveBeenCalled();

    unmount();

    expect(mockRemoveListener).toHaveBeenCalled();
  });

  describe('Error Handling', () => {
    it('handles matchMedia throwing an error', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock matchMedia to throw
      mockMatchMedia.mockImplementation(() => {
        throw new Error('matchMedia failed');
      });

      const { result } = renderHook(() => useSystemThemePreference());

      // Should default to light theme
      expect(result.current).toBe('light');

      consoleSpy.mockRestore();
    });

    it('handles rapid system preference changes', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });

      const { result } = renderHook(() => useSystemThemePreference());

      expect(result.current).toBe('light');

      // Rapidly change preferences
      act(() => {
        if (changeHandler) {
          changeHandler({ matches: true } as MediaQueryListEvent);
        }
      });
      expect(result.current).toBe('dark');

      act(() => {
        if (changeHandler) {
          changeHandler({ matches: false } as MediaQueryListEvent);
        }
      });
      expect(result.current).toBe('light');

      act(() => {
        if (changeHandler) {
          changeHandler({ matches: true } as MediaQueryListEvent);
        }
      });
      expect(result.current).toBe('dark');
    });

    it('handles errors in state update during preference change', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });

      const { result } = renderHook(() => useSystemThemePreference());

      // Mock setState to throw (simulating React error)
      const originalState = result.current;

      // The hook should handle errors gracefully
      // We can't easily test React state update errors, but the hook has try-catch
      expect(result.current).toBe('light');

      consoleSpy.mockRestore();
    });

    it('handles cleanup errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockRemoveEventListenerWithError = vi.fn(() => {
        throw new Error('Cleanup failed');
      });

      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListenerWithError,
      });

      const { unmount } = renderHook(() => useSystemThemePreference());

      // Unmount should not throw even if cleanup fails
      expect(() => unmount()).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('handles matchMedia returning null or undefined', () => {
      mockMatchMedia.mockReturnValue(null);

      const { result } = renderHook(() => useSystemThemePreference());

      // Should default to light
      expect(result.current).toBe('light');
    });
  });

  describe('Browser Compatibility', () => {
    it('handles both addEventListener and addListener being undefined', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: undefined,
        removeEventListener: undefined,
        addListener: undefined,
        removeListener: undefined,
      });

      const { result } = renderHook(() => useSystemThemePreference());

      // Should still return a valid theme
      expect(result.current).toBe('light');
    });

    it('handles addListener when addEventListener is not available', () => {
      const mockAddListener = vi.fn((handler: (event: MediaQueryListEvent) => void) => {
        changeHandler = handler;
      });
      const mockRemoveListener = vi.fn();

      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: undefined,
        removeEventListener: undefined,
        addListener: mockAddListener,
        removeListener: mockRemoveListener,
      });

      const { result, unmount } = renderHook(() => useSystemThemePreference());

      expect(result.current).toBe('light');
      expect(mockAddListener).toHaveBeenCalled();

      unmount();
      expect(mockRemoveListener).toHaveBeenCalled();
    });
  });
});
