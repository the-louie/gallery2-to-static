/**
 * ViewModeContext Tests
 *
 * Tests for the view mode context, provider, and useViewMode hook.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ViewModeProvider, useViewMode, type ViewModePreference } from './ViewModeContext';
import type { ViewMode } from '../types';

// Helper to create wrapper with ViewModeProvider
function createWrapper(defaultPreference?: ViewModePreference) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ViewModeProvider defaultPreference={defaultPreference}>
        {children}
      </ViewModeProvider>
    );
  };
}

describe('ViewModeContext', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
  });

  describe('ViewModeProvider', () => {
    it('provides context value', () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('albumViewMode');
      expect(result.current).toHaveProperty('imageViewMode');
      expect(result.current).toHaveProperty('setAlbumViewMode');
      expect(result.current).toHaveProperty('setImageViewMode');
    });

    it('defaults to grid for both albums and images', () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper(),
      });

      expect(result.current.albumViewMode).toBe('grid');
      expect(result.current.imageViewMode).toBe('grid');
    });

    it('uses provided default preference', () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'list', images: 'grid' }),
      });

      expect(result.current.albumViewMode).toBe('list');
      expect(result.current.imageViewMode).toBe('grid');
    });

    it('persists preference to localStorage', () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAlbumViewMode('list');
      });

      const stored = JSON.parse(localStorage.getItem('gallery-view-mode-preference')!);
      expect(stored.albums).toBe('list');
      expect(stored.images).toBe('grid');
    });

    it('reads preference from localStorage on mount', () => {
      localStorage.setItem(
        'gallery-view-mode-preference',
        JSON.stringify({ albums: 'list', images: 'list' })
      );

      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper(),
      });

      expect(result.current.albumViewMode).toBe('list');
      expect(result.current.imageViewMode).toBe('list');
    });

    it('setAlbumViewMode updates album view mode', () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
      });

      expect(result.current.albumViewMode).toBe('grid');

      act(() => {
        result.current.setAlbumViewMode('list');
      });

      expect(result.current.albumViewMode).toBe('list');
      expect(result.current.imageViewMode).toBe('grid'); // Should not change
    });

    it('setImageViewMode updates image view mode', () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
      });

      expect(result.current.imageViewMode).toBe('grid');

      act(() => {
        result.current.setImageViewMode('list');
      });

      expect(result.current.imageViewMode).toBe('list');
      expect(result.current.albumViewMode).toBe('grid'); // Should not change
    });

    it('maintains separate preferences for albums and images', () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
      });

      act(() => {
        result.current.setAlbumViewMode('list');
      });

      expect(result.current.albumViewMode).toBe('list');
      expect(result.current.imageViewMode).toBe('grid');

      act(() => {
        result.current.setImageViewMode('list');
      });

      expect(result.current.albumViewMode).toBe('list');
      expect(result.current.imageViewMode).toBe('list');
    });
  });

  describe('useViewMode', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useViewMode());
      }).toThrow('useViewMode must be used within a ViewModeProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('View Mode Resolution', () => {
    it('resolves grid preference to grid view', () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
      });

      expect(result.current.albumViewMode).toBe('grid');
      expect(result.current.imageViewMode).toBe('grid');
    });

    it('resolves list preference to list view', () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'list', images: 'list' }),
      });

      expect(result.current.albumViewMode).toBe('list');
      expect(result.current.imageViewMode).toBe('list');
    });

    it('defaults to grid for invalid values', () => {
      // Store invalid preference
      localStorage.setItem(
        'gallery-view-mode-preference',
        JSON.stringify({ albums: 'invalid', images: 'invalid' })
      );

      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper(),
      });

      // Should default to grid
      expect(result.current.albumViewMode).toBe('grid');
      expect(result.current.imageViewMode).toBe('grid');
    });
  });

  describe('Preference Updates', () => {
    it('updates from grid to list', () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
      });

      act(() => {
        result.current.setAlbumViewMode('list');
      });

      expect(result.current.albumViewMode).toBe('list');
    });

    it('updates from list to grid', () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'list', images: 'list' }),
      });

      act(() => {
        result.current.setAlbumViewMode('grid');
      });

      expect(result.current.albumViewMode).toBe('grid');
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

      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'list', images: 'list' }),
      });

      // Should use defaultPreference when localStorage fails
      expect(result.current.albumViewMode).toBe('list');
      expect(result.current.imageViewMode).toBe('list');

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
      localStorage.setItem('gallery-view-mode-preference', 'invalid json{');

      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
      });

      // Should fall back to default preference
      expect(result.current.albumViewMode).toBe('grid');
      expect(result.current.imageViewMode).toBe('grid');

      consoleSpy.mockRestore();
    });

    it('always returns valid view modes even on errors', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock localStorage to fail
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
      });

      // Should always return valid view modes
      expect(['grid', 'list']).toContain(result.current.albumViewMode);
      expect(['grid', 'list']).toContain(result.current.imageViewMode);

      // Restore
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('complete view mode switching flow: grid -> list -> grid', () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
      });

      // Start with grid
      expect(result.current.albumViewMode).toBe('grid');
      expect(result.current.imageViewMode).toBe('grid');

      // Switch albums to list
      act(() => {
        result.current.setAlbumViewMode('list');
      });
      expect(result.current.albumViewMode).toBe('list');
      expect(result.current.imageViewMode).toBe('grid');
      const stored1 = JSON.parse(localStorage.getItem('gallery-view-mode-preference')!);
      expect(stored1.albums).toBe('list');
      expect(stored1.images).toBe('grid');

      // Switch images to list
      act(() => {
        result.current.setImageViewMode('list');
      });
      expect(result.current.albumViewMode).toBe('list');
      expect(result.current.imageViewMode).toBe('list');
      const stored2 = JSON.parse(localStorage.getItem('gallery-view-mode-preference')!);
      expect(stored2.albums).toBe('list');
      expect(stored2.images).toBe('list');

      // Switch albums back to grid
      act(() => {
        result.current.setAlbumViewMode('grid');
      });
      expect(result.current.albumViewMode).toBe('grid');
      expect(result.current.imageViewMode).toBe('list');
      const stored3 = JSON.parse(localStorage.getItem('gallery-view-mode-preference')!);
      expect(stored3.albums).toBe('grid');
      expect(stored3.images).toBe('list');
    });

    it('separate preferences persist independently', () => {
      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
      });

      // Set albums to list
      act(() => {
        result.current.setAlbumViewMode('list');
      });

      // Images should still be grid
      expect(result.current.albumViewMode).toBe('list');
      expect(result.current.imageViewMode).toBe('grid');

      // Set images to list
      act(() => {
        result.current.setImageViewMode('list');
      });

      // Both should be list now
      expect(result.current.albumViewMode).toBe('list');
      expect(result.current.imageViewMode).toBe('list');

      // Set albums back to grid
      act(() => {
        result.current.setAlbumViewMode('grid');
      });

      // Albums should be grid, images should still be list
      expect(result.current.albumViewMode).toBe('grid');
      expect(result.current.imageViewMode).toBe('list');
    });

    it('error recovery scenario: localStorage fails then recovers', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Start with localStorage unavailable
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      const { result, rerender } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'list', images: 'list' }),
      });

      // Should work with defaultPreference when localStorage unavailable
      expect(result.current.albumViewMode).toBe('list');
      expect(result.current.imageViewMode).toBe('list');

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });

      // Rerender to trigger localStorage read
      rerender();

      // Should now be able to persist preferences
      act(() => {
        result.current.setAlbumViewMode('grid');
      });

      expect(result.current.albumViewMode).toBe('grid');
      const stored = JSON.parse(localStorage.getItem('gallery-view-mode-preference')!);
      expect(stored.albums).toBe('grid');

      consoleSpy.mockRestore();
    });

    it('error recovery scenario: corrupted data then valid data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Set corrupted data
      localStorage.setItem('gallery-view-mode-preference', 'invalid json{');

      const { result } = renderHook(() => useViewMode(), {
        wrapper: createWrapper({ albums: 'grid', images: 'grid' }),
      });

      // Should handle corrupted data gracefully
      expect(result.current.albumViewMode).toBe('grid');
      expect(result.current.imageViewMode).toBe('grid');

      // Corrupted data should be cleaned up
      expect(localStorage.getItem('gallery-view-mode-preference')).toBeNull();

      // Now set valid data
      act(() => {
        result.current.setAlbumViewMode('list');
      });

      expect(result.current.albumViewMode).toBe('list');
      const stored = JSON.parse(localStorage.getItem('gallery-view-mode-preference')!);
      expect(stored.albums).toBe('list');

      consoleSpy.mockRestore();
    });
  });
});
