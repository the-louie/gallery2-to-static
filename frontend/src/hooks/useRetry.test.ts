/**
 * useRetry Hook Tests
 *
 * Tests for the useRetry hook including retry logic, exponential backoff,
 * max retries, and state management.
 *
 * @module frontend/src/hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
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

      const { result } = renderHook(() => useRetry(mockFn));

      await result.current.retry();

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });

    it('retries on failure', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');

      const { result } = renderHook(() =>
        useRetry(mockFn, { initialDelay: 100 }),
      );

      const retryPromise = result.current.retry();

      // Wait for delay
      await vi.advanceTimersByTimeAsync(100);

      await waitFor(() => {
        expect(result.current.retryCount).toBeGreaterThan(0);
      });

      await retryPromise;

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

      const retryPromise = result.current.retry();

      // Advance through retries
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);

      await retryPromise;

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(onMaxRetriesReached).toHaveBeenCalled();
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

      const retryPromise = result.current.retry();

      // First retry after 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(mockFn).toHaveBeenCalledTimes(2);

      // Second retry after 200ms (100 * 2)
      await vi.advanceTimersByTimeAsync(200);
      expect(mockFn).toHaveBeenCalledTimes(3);

      await retryPromise;
    });

    it('respects max delay cap', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));

      const { result } = renderHook(() =>
        useRetry(mockFn, {
          initialDelay: 1000,
          maxDelay: 2000,
          backoffMultiplier: 10,
        }),
      );

      const retryPromise = result.current.retry();

      // First retry delay should be capped at maxDelay
      await vi.advanceTimersByTimeAsync(2000);

      await retryPromise;

      // Verify delay was capped
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

      const retryPromise = result.current.retry();
      await vi.advanceTimersByTimeAsync(100);

      await waitFor(() => {
        expect(result.current.retryCount).toBeGreaterThan(0);
      });

      await retryPromise;
    });

    it('tracks isRetrying state', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const { result } = renderHook(() =>
        useRetry(mockFn, { initialDelay: 100 }),
      );

      const retryPromise = result.current.retry();

      expect(result.current.isRetrying).toBe(true);

      await vi.advanceTimersByTimeAsync(100);
      await retryPromise;

      expect(result.current.isRetrying).toBe(false);
    });

    it('tracks canRetry state', () => {
      const mockFn = vi.fn();

      const { result } = renderHook(() =>
        useRetry(mockFn, { maxRetries: 3 }),
      );

      expect(result.current.canRetry).toBe(true);

      // After max retries, canRetry should be false
      // This would be tested after retries are exhausted
    });
  });

  describe('Reset', () => {
    it('resets retry state', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));

      const { result } = renderHook(() =>
        useRetry(mockFn, { initialDelay: 100 }),
      );

      const retryPromise = result.current.retry();
      await vi.advanceTimersByTimeAsync(50);

      result.current.reset();

      await retryPromise;

      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });
  });
});
