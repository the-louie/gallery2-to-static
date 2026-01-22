/**
 * useSwipeGesture Hook Tests
 *
 * Comprehensive tests for the useSwipeGesture hook covering swipe detection,
 * velocity calculation, gesture state management, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeGesture } from './useSwipeGesture';
import {
  createTouchStart,
  createTouchMove,
  createTouchEnd,
  createTouchCancel,
} from '@/test-utils/touch-events';

describe('useSwipeGesture', () => {
  let mockElement: HTMLElement;
  let mockCallbacks: {
    onSwipeLeft: ReturnType<typeof vi.fn>;
    onSwipeRight: ReturnType<typeof vi.fn>;
    onSwipeUp: ReturnType<typeof vi.fn>;
    onSwipeDown: ReturnType<typeof vi.fn>;
    onSwipeStart: ReturnType<typeof vi.fn>;
    onSwipeCancel: ReturnType<typeof vi.fn>;
    onSwipeProgress: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);

    mockCallbacks = {
      onSwipeLeft: vi.fn(),
      onSwipeRight: vi.fn(),
      onSwipeUp: vi.fn(),
      onSwipeDown: vi.fn(),
      onSwipeStart: vi.fn(),
      onSwipeCancel: vi.fn(),
      onSwipeProgress: vi.fn(),
    };

    // Mock Date.now for consistent timing
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
    vi.useRealTimers();
  });

  describe('Horizontal Swipe Detection', () => {
    it('detects swipe left gesture', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeLeft: mockCallbacks.onSwipeLeft,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      expect(mockCallbacks.onSwipeStart).toHaveBeenCalledTimes(1);

      // Move touch left (more than 50px)
      const moveEvent = createTouchMove(mockElement, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchMove(moveEvent);
      });

      // End touch
      const endEvent = createTouchEnd(
        mockElement,
        [{ identifier: 1, clientX: 50, clientY: 100 }],
        [{ identifier: 1, clientX: 50, clientY: 100 }],
      );
      act(() => {
        result.current.onTouchEnd(endEvent);
      });

      expect(mockCallbacks.onSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it('detects swipe right gesture', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeRight: mockCallbacks.onSwipeRight,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      // Move touch right (more than 50px)
      const moveEvent = createTouchMove(mockElement, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchMove(moveEvent);
      });

      // End touch
      const endEvent = createTouchEnd(
        mockElement,
        [{ identifier: 1, clientX: 250, clientY: 100 }],
        [{ identifier: 1, clientX: 250, clientY: 100 }],
      );
      act(() => {
        result.current.onTouchEnd(endEvent);
      });

      expect(mockCallbacks.onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it('does not trigger swipe for insufficient distance', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeLeft: mockCallbacks.onSwipeLeft,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      // Move touch left (less than 50px)
      const moveEvent = createTouchMove(mockElement, [
        { identifier: 1, clientX: 160, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchMove(moveEvent);
      });

      // End touch
      const endEvent = createTouchEnd(
        mockElement,
        [{ identifier: 1, clientX: 160, clientY: 100 }],
        [{ identifier: 1, clientX: 160, clientY: 100 }],
      );
      act(() => {
        result.current.onTouchEnd(endEvent);
      });

      expect(mockCallbacks.onSwipeLeft).not.toHaveBeenCalled();
      expect(mockCallbacks.onSwipeCancel).toHaveBeenCalled();
    });
  });

  describe('Vertical Swipe Detection', () => {
    it('detects swipe up gesture', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeUp: mockCallbacks.onSwipeUp,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 100, clientY: 200 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      // Move touch up (more than 50px)
      const moveEvent = createTouchMove(mockElement, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchMove(moveEvent);
      });

      // End touch
      const endEvent = createTouchEnd(
        mockElement,
        [{ identifier: 1, clientX: 100, clientY: 50 }],
        [{ identifier: 1, clientX: 100, clientY: 50 }],
      );
      act(() => {
        result.current.onTouchEnd(endEvent);
      });

      expect(mockCallbacks.onSwipeUp).toHaveBeenCalledTimes(1);
    });

    it('detects swipe down gesture', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeDown: mockCallbacks.onSwipeDown,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      // Move touch down (more than 50px)
      const moveEvent = createTouchMove(mockElement, [
        { identifier: 1, clientX: 100, clientY: 200 },
      ]);
      act(() => {
        result.current.onTouchMove(moveEvent);
      });

      // End touch
      const endEvent = createTouchEnd(
        mockElement,
        [{ identifier: 1, clientX: 100, clientY: 250 }],
        [{ identifier: 1, clientX: 100, clientY: 250 }],
      );
      act(() => {
        result.current.onTouchEnd(endEvent);
      });

      expect(mockCallbacks.onSwipeDown).toHaveBeenCalledTimes(1);
    });
  });

  describe('Swipe Thresholds', () => {
    it('requires minimum distance of 50px', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeLeft: mockCallbacks.onSwipeLeft,
          minDistance: 50,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      // Move touch left (exactly 49px - should fail)
      const moveEvent = createTouchMove(mockElement, [
        { identifier: 1, clientX: 151, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchMove(moveEvent);
      });

      // End touch
      const endEvent = createTouchEnd(
        mockElement,
        [{ identifier: 1, clientX: 151, clientY: 100 }],
        [{ identifier: 1, clientX: 151, clientY: 100 }],
      );
      act(() => {
        result.current.onTouchEnd(endEvent);
      });

      expect(mockCallbacks.onSwipeLeft).not.toHaveBeenCalled();
    });

    it('requires minimum velocity', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeLeft: mockCallbacks.onSwipeLeft,
          minVelocity: 0.3,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      // Move touch left
      const moveEvent = createTouchMove(mockElement, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchMove(moveEvent);
      });

      // End touch after a very long time (low velocity)
      act(() => {
        vi.advanceTimersByTime(10000); // 10 seconds
      });

      const endEvent = createTouchEnd(
        mockElement,
        [{ identifier: 1, clientX: 50, clientY: 100 }],
        [{ identifier: 1, clientX: 50, clientY: 100 }],
      );
      act(() => {
        result.current.onTouchEnd(endEvent);
      });

      // Should not trigger due to low velocity
      expect(mockCallbacks.onSwipeLeft).not.toHaveBeenCalled();
    });
  });

  describe('Multi-Touch Scenarios', () => {
    it('does not trigger swipe with two touches', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeLeft: mockCallbacks.onSwipeLeft,
        }),
      );

      // Start touch with two fingers
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 200, clientY: 100 },
        { identifier: 2, clientX: 250, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      expect(mockCallbacks.onSwipeLeft).not.toHaveBeenCalled();
      expect(mockCallbacks.onSwipeCancel).toHaveBeenCalled();
    });

    it('cancels swipe when second touch is added', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeLeft: mockCallbacks.onSwipeLeft,
        }),
      );

      // Start touch with one finger
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      // Add second touch
      const moveEvent = createTouchMove(mockElement, [
        { identifier: 1, clientX: 150, clientY: 100 },
        { identifier: 2, clientX: 250, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchMove(moveEvent);
      });

      expect(mockCallbacks.onSwipeCancel).toHaveBeenCalled();
    });
  });

  describe('Diagonal Swipes', () => {
    it('does not trigger swipe for diagonal gesture', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeLeft: mockCallbacks.onSwipeLeft,
          onSwipeUp: mockCallbacks.onSwipeUp,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 200, clientY: 200 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      // Move diagonally (equal X and Y movement)
      const moveEvent = createTouchMove(mockElement, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchMove(moveEvent);
      });

      // End touch
      const endEvent = createTouchEnd(
        mockElement,
        [{ identifier: 1, clientX: 100, clientY: 100 }],
        [{ identifier: 1, clientX: 100, clientY: 100 }],
      );
      act(() => {
        result.current.onTouchEnd(endEvent);
      });

      // Should not trigger either direction
      expect(mockCallbacks.onSwipeLeft).not.toHaveBeenCalled();
      expect(mockCallbacks.onSwipeUp).not.toHaveBeenCalled();
    });
  });

  describe('Progress Callback', () => {
    it('calls onSwipeProgress during swipe', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeProgress: mockCallbacks.onSwipeProgress,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      // Move touch
      const moveEvent = createTouchMove(mockElement, [
        { identifier: 1, clientX: 150, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchMove(moveEvent);
      });

      expect(mockCallbacks.onSwipeProgress).toHaveBeenCalled();
      const progressCall = mockCallbacks.onSwipeProgress.mock.calls[0][0];
      expect(progressCall.dx).toBeLessThan(0); // Moving left
      expect(progressCall.dy).toBe(0);
      expect(progressCall.distance).toBeGreaterThan(0);
    });
  });

  describe('Touch Cancel', () => {
    it('cancels swipe on touch cancel', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeLeft: mockCallbacks.onSwipeLeft,
          onSwipeCancel: mockCallbacks.onSwipeCancel,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      // Cancel touch
      const cancelEvent = createTouchCancel(mockElement, [
        { identifier: 1, clientX: 150, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchCancel(cancelEvent);
      });

      expect(mockCallbacks.onSwipeCancel).toHaveBeenCalled();
      expect(mockCallbacks.onSwipeLeft).not.toHaveBeenCalled();
    });
  });

  describe('Enabled/Disabled State', () => {
    it('does not detect swipe when disabled', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeLeft: mockCallbacks.onSwipeLeft,
          enabled: false,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      expect(mockCallbacks.onSwipeStart).not.toHaveBeenCalled();
    });
  });

  describe('Direction Enable/Disable', () => {
    it('does not detect horizontal swipe when disabled', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeLeft: mockCallbacks.onSwipeLeft,
          enableHorizontal: false,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      // Move touch left
      const moveEvent = createTouchMove(mockElement, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchMove(moveEvent);
      });

      // End touch
      const endEvent = createTouchEnd(
        mockElement,
        [{ identifier: 1, clientX: 50, clientY: 100 }],
        [{ identifier: 1, clientX: 50, clientY: 100 }],
      );
      act(() => {
        result.current.onTouchEnd(endEvent);
      });

      expect(mockCallbacks.onSwipeLeft).not.toHaveBeenCalled();
    });

    it('does not detect vertical swipe when disabled', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeUp: mockCallbacks.onSwipeUp,
          enableVertical: false,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 100, clientY: 200 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      // Move touch up
      const moveEvent = createTouchMove(mockElement, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchMove(moveEvent);
      });

      // End touch
      const endEvent = createTouchEnd(
        mockElement,
        [{ identifier: 1, clientX: 100, clientY: 50 }],
        [{ identifier: 1, clientX: 100, clientY: 50 }],
      );
      act(() => {
        result.current.onTouchEnd(endEvent);
      });

      expect(mockCallbacks.onSwipeUp).not.toHaveBeenCalled();
    });
  });

  describe('Timeout', () => {
    it('cancels swipe after timeout', async () => {
      const { result } = renderHook(() =>
        useSwipeGesture({
          onSwipeLeft: mockCallbacks.onSwipeLeft,
          onSwipeCancel: mockCallbacks.onSwipeCancel,
        }),
      );

      // Start touch
      const startEvent = createTouchStart(mockElement, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      act(() => {
        result.current.onTouchStart(startEvent);
      });

      // Advance time beyond timeout (300ms)
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(mockCallbacks.onSwipeCancel).toHaveBeenCalled();
      expect(mockCallbacks.onSwipeLeft).not.toHaveBeenCalled();
    });
  });
});
