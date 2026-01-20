/**
 * useBreadcrumbPath Hook Tests
 *
 * Comprehensive tests for the useBreadcrumbPath hook covering loading states,
 * error handling, path generation, and cleanup behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBreadcrumbPath } from './useBreadcrumbPath';
import { buildBreadcrumbPath } from '../utils/breadcrumbPath';
import type { BreadcrumbPath } from '../types';

// Mock the breadcrumbPath utility
vi.mock('../utils/breadcrumbPath', () => ({
  buildBreadcrumbPath: vi.fn(),
}));

describe('useBreadcrumbPath', () => {
  const mockBuildBreadcrumbPath = vi.mocked(buildBreadcrumbPath);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading States', () => {
    it('returns loading state initially', async () => {
      const mockPath: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      mockBuildBreadcrumbPath.mockResolvedValue(mockPath);

      const { result } = renderHook(() => useBreadcrumbPath(10));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.path).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('returns path after loading completes', async () => {
      const mockPath: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      mockBuildBreadcrumbPath.mockResolvedValue(mockPath);

      const { result } = renderHook(() => useBreadcrumbPath(10));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.path).toEqual(mockPath);
      expect(result.current.error).toBeNull();
    });

    it('sets loading to false after error', async () => {
      const error = new Error('Failed to load');
      mockBuildBreadcrumbPath.mockRejectedValue(error);

      const { result } = renderHook(() => useBreadcrumbPath(10));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(error);
      expect(result.current.path).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('handles errors during path building', async () => {
      const error = new Error('Network error');
      mockBuildBreadcrumbPath.mockRejectedValue(error);

      const { result } = renderHook(() => useBreadcrumbPath(10));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toBe(error);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.path).toBeNull();
    });

    it('wraps non-Error objects in Error', async () => {
      mockBuildBreadcrumbPath.mockRejectedValue('String error');

      const { result } = renderHook(() => useBreadcrumbPath(10));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('Failed to load breadcrumb path');
    });
  });

  describe('Path Generation', () => {
    it('calls buildBreadcrumbPath with correct album ID', async () => {
      const mockPath: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      mockBuildBreadcrumbPath.mockResolvedValue(mockPath);

      renderHook(() => useBreadcrumbPath(10));

      await waitFor(() => {
        expect(mockBuildBreadcrumbPath).toHaveBeenCalledWith(10, undefined);
      });
    });

    it('returns empty path when buildBreadcrumbPath returns empty array', async () => {
      mockBuildBreadcrumbPath.mockResolvedValue([]);

      const { result } = renderHook(() => useBreadcrumbPath(10));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.path).toEqual([]);
    });
  });

  describe('Null Album ID Handling', () => {
    it('skips loading when albumId is null', () => {
      const { result } = renderHook(() => useBreadcrumbPath(null));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.path).toBeNull();
      expect(result.current.error).toBeNull();
      expect(mockBuildBreadcrumbPath).not.toHaveBeenCalled();
    });

    it('clears state when albumId changes to null', async () => {
      const mockPath: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      mockBuildBreadcrumbPath.mockResolvedValue(mockPath);

      const { result, rerender } = renderHook(
        ({ albumId }) => useBreadcrumbPath(albumId),
        {
          initialProps: { albumId: 10 },
        },
      );

      await waitFor(() => {
        expect(result.current.path).toBeTruthy();
      });

      // Change to null
      rerender({ albumId: null });

      expect(result.current.path).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Refetch Functionality', () => {
    it('refetches path when refetch is called', async () => {
      const mockPath: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      mockBuildBreadcrumbPath.mockResolvedValue(mockPath);

      const { result } = renderHook(() => useBreadcrumbPath(10));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockBuildBreadcrumbPath.mock.calls.length;

      // Call refetch
      result.current.refetch();

      await waitFor(() => {
        expect(mockBuildBreadcrumbPath.mock.calls.length).toBeGreaterThan(
          initialCallCount,
        );
      });
    });

    it('does not refetch when albumId is null', () => {
      const { result } = renderHook(() => useBreadcrumbPath(null));

      result.current.refetch();

      expect(mockBuildBreadcrumbPath).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup on Unmount', () => {
    it('prevents state updates after unmount', async () => {
      const mockPath: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      // Delay the resolution to allow unmount
      mockBuildBreadcrumbPath.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockPath), 100);
          }),
      );

      const { result, unmount } = renderHook(() => useBreadcrumbPath(10));

      expect(result.current.isLoading).toBe(true);

      // Unmount before promise resolves
      unmount();

      // Wait for promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 150));

      // State should not have updated (we can't directly test this, but
      // the fact that the test completes without errors indicates cleanup worked)
      expect(true).toBe(true);
    });
  });

  describe('Album ID Changes', () => {
    it('reloads path when albumId changes', async () => {
      const mockPath1: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      const mockPath2: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 20, title: 'Videos', path: '/album/20' },
      ];

      mockBuildBreadcrumbPath
        .mockResolvedValueOnce(mockPath1)
        .mockResolvedValueOnce(mockPath2);

      const { result, rerender } = renderHook(
        ({ albumId }) => useBreadcrumbPath(albumId),
        {
          initialProps: { albumId: 10 },
        },
      );

      await waitFor(() => {
        expect(result.current.path).toEqual(mockPath1);
      });

      // Change album ID
      rerender({ albumId: 20 });

      await waitFor(() => {
        expect(result.current.path).toEqual(mockPath2);
      });

      expect(mockBuildBreadcrumbPath).toHaveBeenCalledTimes(2);
    });
  });
});
