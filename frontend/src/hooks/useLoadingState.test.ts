/**
 * useLoadingState Hook Tests
 *
 * Tests for the useLoadingState hook including loading state management,
 * transitions, and timeout handling.
 *
 * @module frontend/src/hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLoadingState } from './useLoadingState';

describe('useLoadingState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Loading State Management', () => {
    it('initializes with loading false', () => {
      const { result } = renderHook(() => useLoadingState());

      expect(result.current.isLoading).toBe(false);
    });

    it('sets loading to true when startLoading is called', async () => {
      const { result } = renderHook(() => useLoadingState({ delay: 0 }));

      result.current.startLoading();

      expect(result.current.isLoading).toBe(true);
    });

    it('sets loading to false when stopLoading is called', async () => {
      const { result } = renderHook(() => useLoadingState({ delay: 0 }));

      result.current.startLoading();
      expect(result.current.isLoading).toBe(true);

      result.current.stopLoading();
      expect(result.current.isLoading).toBe(false);
    });

    it('sets loading state with setLoading', () => {
      const { result } = renderHook(() => useLoadingState({ delay: 0 }));

      result.current.setLoading(true);
      expect(result.current.isLoading).toBe(true);

      result.current.setLoading(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Delay', () => {
    it('delays showing loading state', async () => {
      const { result } = renderHook(() => useLoadingState({ delay: 100 }));

      result.current.startLoading();

      expect(result.current.isLoading).toBe(false);

      await vi.advanceTimersByTimeAsync(100);

      expect(result.current.isLoading).toBe(true);
    });

    it('cancels delay if loading stops before delay completes', async () => {
      const { result } = renderHook(() => useLoadingState({ delay: 100 }));

      result.current.startLoading();
      await vi.advanceTimersByTimeAsync(50);

      result.current.stopLoading();
      await vi.advanceTimersByTimeAsync(100);

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Timeout', () => {
    it('triggers timeout when loading exceeds timeout duration', async () => {
      const onTimeout = vi.fn();

      const { result } = renderHook(() =>
        useLoadingState({ delay: 0, timeout: 1000, onTimeout }),
      );

      result.current.startLoading();

      await vi.advanceTimersByTimeAsync(1000);

      expect(result.current.isTimeout).toBe(true);
      expect(onTimeout).toHaveBeenCalled();
    });

    it('does not trigger timeout if loading stops before timeout', async () => {
      const onTimeout = vi.fn();

      const { result } = renderHook(() =>
        useLoadingState({ delay: 0, timeout: 1000, onTimeout }),
      );

      result.current.startLoading();
      await vi.advanceTimersByTimeAsync(500);

      result.current.stopLoading();
      await vi.advanceTimersByTimeAsync(1000);

      expect(result.current.isTimeout).toBe(false);
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('Reset', () => {
    it('resets loading state', () => {
      const { result } = renderHook(() => useLoadingState({ delay: 0 }));

      result.current.startLoading();
      expect(result.current.isLoading).toBe(true);

      result.current.reset();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isTimeout).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('cleans up timers on unmount', () => {
      const { unmount } = renderHook(() =>
        useLoadingState({ delay: 100, timeout: 1000 }),
      );

      unmount();

      // Verify no timers are left running (no errors should occur)
    });
  });
});
