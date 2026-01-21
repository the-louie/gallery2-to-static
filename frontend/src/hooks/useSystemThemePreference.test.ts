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
});
