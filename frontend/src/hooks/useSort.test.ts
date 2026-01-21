/**
 * useSort Hook Tests
 *
 * Tests for the sort state management hook with localStorage persistence.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSort } from './useSort';
import type { SortOption } from '@/types';

describe('useSort', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('albums context', () => {
    it('returns default sort option when localStorage is empty', () => {
      const { result } = renderHook(() => useSort('albums'));

      expect(result.current.option).toBe('date-desc');
    });

    it('reads existing value from localStorage', () => {
      localStorage.setItem('gallery-sort-albums', JSON.stringify('name-asc'));

      const { result } = renderHook(() => useSort('albums'));

      expect(result.current.option).toBe('name-asc');
    });

    it('writes value to localStorage', () => {
      const { result } = renderHook(() => useSort('albums'));

      act(() => {
        result.current.setOption('name-desc');
      });

      expect(result.current.option).toBe('name-desc');
      expect(JSON.parse(localStorage.getItem('gallery-sort-albums')!)).toBe(
        'name-desc'
      );
    });

    it('updates value with function', () => {
      const { result } = renderHook(() => useSort('albums'));

      act(() => {
        result.current.setOption((prev) =>
          prev === 'date-desc' ? 'date-asc' : 'date-desc'
        );
      });

      expect(result.current.option).toBe('date-asc');
    });

    it('handles all sort options', () => {
      const options: SortOption[] = [
        'date-asc',
        'date-desc',
        'name-asc',
        'name-desc',
        'size-asc',
        'size-desc',
      ];

      options.forEach((option) => {
        const { result } = renderHook(() => useSort('albums'));

        act(() => {
          result.current.setOption(option);
        });

        expect(result.current.option).toBe(option);
        expect(JSON.parse(localStorage.getItem('gallery-sort-albums')!)).toBe(
          option
        );
      });
    });
  });

  describe('images context', () => {
    it('returns default sort option when localStorage is empty', () => {
      const { result } = renderHook(() => useSort('images'));

      expect(result.current.option).toBe('date-desc');
    });

    it('reads existing value from localStorage', () => {
      localStorage.setItem('gallery-sort-images', JSON.stringify('size-asc'));

      const { result } = renderHook(() => useSort('images'));

      expect(result.current.option).toBe('size-asc');
    });

    it('writes value to localStorage', () => {
      const { result } = renderHook(() => useSort('images'));

      act(() => {
        result.current.setOption('size-desc');
      });

      expect(result.current.option).toBe('size-desc');
      expect(JSON.parse(localStorage.getItem('gallery-sort-images')!)).toBe(
        'size-desc'
      );
    });
  });

  describe('separate preferences', () => {
    it('maintains separate preferences for albums and images', () => {
      const { result: albumsResult } = renderHook(() => useSort('albums'));
      const { result: imagesResult } = renderHook(() => useSort('images'));

      act(() => {
        albumsResult.current.setOption('name-asc');
        imagesResult.current.setOption('size-desc');
      });

      expect(albumsResult.current.option).toBe('name-asc');
      expect(imagesResult.current.option).toBe('size-desc');

      expect(JSON.parse(localStorage.getItem('gallery-sort-albums')!)).toBe(
        'name-asc'
      );
      expect(JSON.parse(localStorage.getItem('gallery-sort-images')!)).toBe(
        'size-desc'
      );
    });

    it('does not interfere between contexts', () => {
      const { result: albumsResult } = renderHook(() => useSort('albums'));
      const { result: imagesResult } = renderHook(() => useSort('images'));

      act(() => {
        albumsResult.current.setOption('date-asc');
      });

      // Images should still have default
      expect(imagesResult.current.option).toBe('date-desc');
      expect(localStorage.getItem('gallery-sort-images')).toBeNull();
    });
  });

  describe('localStorage error handling', () => {
    it('uses default value when localStorage is unavailable', () => {
      // Mock localStorage to be unavailable
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => {
            throw new Error('localStorage not available');
          }),
          setItem: vi.fn(() => {
            throw new Error('localStorage not available');
          }),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      });

      const { result } = renderHook(() => useSort('albums'));

      // Should use default value
      expect(result.current.option).toBe('date-desc');

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('handles corrupted localStorage data', () => {
      localStorage.setItem('gallery-sort-albums', 'invalid json{');

      const { result } = renderHook(() => useSort('albums'));

      // Should use default value when data is corrupted
      expect(result.current.option).toBe('date-desc');
    });
  });

  describe('SortState interface', () => {
    it('returns SortState with option and setOption', () => {
      const { result } = renderHook(() => useSort('albums'));

      expect(result.current).toHaveProperty('option');
      expect(result.current).toHaveProperty('setOption');
      expect(typeof result.current.setOption).toBe('function');
    });

    it('setOption accepts SortOption directly', () => {
      const { result } = renderHook(() => useSort('albums'));

      act(() => {
        result.current.setOption('name-asc');
      });

      expect(result.current.option).toBe('name-asc');
    });

    it('setOption accepts function updater', () => {
      const { result } = renderHook(() => useSort('albums'));

      act(() => {
        result.current.setOption((prev) => {
          return prev === 'date-desc' ? 'date-asc' : 'date-desc';
        });
      });

      expect(result.current.option).toBe('date-asc');
    });
  });
});
