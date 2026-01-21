/**
 * useLocalStorage Hook Tests
 *
 * Tests for the localStorage persistence hook.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    expect(result.current[0]).toBe('defaultValue');
  });

  it('reads existing value from localStorage', () => {
    localStorage.setItem('testKey', JSON.stringify('storedValue'));

    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    expect(result.current[0]).toBe('storedValue');
  });

  it('writes value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'));

    act(() => {
      result.current[1]('newValue');
    });

    expect(result.current[0]).toBe('newValue');
    expect(JSON.parse(localStorage.getItem('testKey')!)).toBe('newValue');
  });

  it('updates value with function', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1]((prev) => prev + 5);
    });

    expect(result.current[0]).toBe(6);
  });

  it('handles complex objects', () => {
    const initialValue = { name: 'test', count: 0 };
    const { result } = renderHook(() => useLocalStorage('objectKey', initialValue));

    expect(result.current[0]).toEqual(initialValue);

    const newValue = { name: 'updated', count: 5 };
    act(() => {
      result.current[1](newValue);
    });

    expect(result.current[0]).toEqual(newValue);
    expect(JSON.parse(localStorage.getItem('objectKey')!)).toEqual(newValue);
  });

  it('handles arrays', () => {
    const initialValue = [1, 2, 3];
    const { result } = renderHook(() => useLocalStorage('arrayKey', initialValue));

    expect(result.current[0]).toEqual(initialValue);

    act(() => {
      result.current[1]((prev) => [...prev, 4]);
    });

    expect(result.current[0]).toEqual([1, 2, 3, 4]);
  });

  it('handles null values', () => {
    const { result } = renderHook(() => useLocalStorage<string | null>('nullKey', null));

    expect(result.current[0]).toBeNull();

    act(() => {
      result.current[1]('not null');
    });

    expect(result.current[0]).toBe('not null');

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
  });

  it('handles boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('boolKey', false));

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
  });

  it('handles JSON parse errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Store invalid JSON
    localStorage.setItem('invalidKey', 'not valid json');

    const { result } = renderHook(() => useLocalStorage('invalidKey', 'fallback'));

    expect(result.current[0]).toBe('fallback');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('handles localStorage not available', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock localStorage to throw
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => {
          throw new Error('localStorage not available');
        },
        setItem: () => {
          throw new Error('localStorage not available');
        },
        removeItem: () => {
          throw new Error('localStorage not available');
        },
      },
      writable: true,
    });

    const { result } = renderHook(() => useLocalStorage('unavailableKey', 'fallback'));

    expect(result.current[0]).toBe('fallback');

    // Restore localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });

    consoleSpy.mockRestore();
  });

  it('persists across re-renders', () => {
    const { result, rerender } = renderHook(() => useLocalStorage('persistKey', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    rerender();

    expect(result.current[0]).toBe('updated');
  });

  it('uses different keys independently', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('key1', 'value1'));
    const { result: result2 } = renderHook(() => useLocalStorage('key2', 'value2'));

    expect(result1.current[0]).toBe('value1');
    expect(result2.current[0]).toBe('value2');

    act(() => {
      result1.current[1]('updated1');
    });

    expect(result1.current[0]).toBe('updated1');
    expect(result2.current[0]).toBe('value2');
  });
});
