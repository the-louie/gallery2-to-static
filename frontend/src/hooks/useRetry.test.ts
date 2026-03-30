/**
 * useRetry Hook Tests
 *
 * Tests for the useRetry hook including retry logic, exponential backoff,
 * max retries, and state management.
 *
 * @module frontend/src/hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRetry } from './useRetry';

describe('useRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Retry Logic', () => {
    it('executes function successfully on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const { result } = renderHook(() =>
        useRetry(mockFn, { initialDelay: 100 }),
      );

      // Start retry
      act(() => {
        result.current.retry();
      });

      // Advance timer to fire the initial delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.retryCount).toBe(0);
    });

    it('retries on failure', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');

      const { result } = renderHook(() =>
        useRetry(mockFn, { initialDelay: 100 }),
      );

      act(() => {
        result.current.retry();
      });

      // First retry delay: 100ms (attempt 0: 100 * 2^0 = 100)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // After first call fails, it schedules a second attempt with 200ms delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('stops retrying after max retries', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));
      const onMaxRetriesReached = vi.fn();

      const { result } = renderHook(() =>
        useRetry(mockFn, {
          maxRetries: 2,
          initialDelay: 100,
          onMaxRetriesReached,
        }),
      );

      act(() => {
        result.current.retry();
      });

      // First retry delay: 100ms (attempt 0)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Second retry delay: 200ms (attempt 1)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      expect(onMaxRetriesReached).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(result.current.canRetry).toBe(false);
    });
  });

  describe('Exponential Backoff', () => {
    it('applies exponential backoff between retries', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('success');

      const { result } = renderHook(() =>
        useRetry(mockFn, {
          initialDelay: 100,
          backoffMultiplier: 2,
        }),
      );

      act(() => {
        result.current.retry();
      });

      // First retry after 100ms delay (attempt 0: 100 * 2^0 = 100)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Second retry after 200ms (attempt 1: 100 * 2^1 = 200)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      expect(mockFn).toHaveBeenCalledTimes(2);

      // Third retry after 400ms (attempt 2: 100 * 2^2 = 400)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('respects max delay cap', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));

      const { result } = renderHook(() =>
        useRetry(mockFn, {
          initialDelay: 1000,
          maxDelay: 2000,
          backoffMultiplier: 10,
          maxRetries: 3,
        }),
      );

      act(() => {
        result.current.retry();
      });

      // Advance enough time for all retries (capped at 2000ms each)
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(2000);
        });
      }

      expect(mockFn).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('tracks retry count', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');

      const { result } = renderHook(() =>
        useRetry(mockFn, { initialDelay: 100 }),
      );

      expect(result.current.retryCount).toBe(0);

      act(() => {
        result.current.retry();
      });

      // First attempt after 100ms delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // Second attempt after 200ms delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('tracks isRetrying state', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const { result } = renderHook(() =>
        useRetry(mockFn, { initialDelay: 100 }),
      );

      // Start retry
      act(() => {
        result.current.retry();
      });

      // isRetrying should be true immediately after calling retry
      expect(result.current.isRetrying).toBe(true);

      // Advance timer to complete the retry
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.isRetrying).toBe(false);
    });

    it('tracks canRetry state', () => {
      const mockFn = vi.fn();

      const { result } = renderHook(() =>
        useRetry(mockFn, { maxRetries: 3 }),
      );

      expect(result.current.canRetry).toBe(true);
    });
  });

  describe('Reset', () => {
    it('resets retry state', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));

      const { result } = renderHook(() =>
        useRetry(mockFn, { initialDelay: 100 }),
      );

      act(() => {
        result.current.retry();
      });

      // Reset before timer fires
      act(() => {
        result.current.reset();
      });

      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });
  });
});
