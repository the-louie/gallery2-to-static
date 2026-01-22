/**
 * React hook for detecting swipe gestures on touch devices
 *
 * Provides swipe detection functionality with configurable thresholds for
 * distance, velocity, and direction. Supports horizontal (left/right) and
 * vertical (up/down) swipe detection with proper conflict resolution.
 *
 * ## Features
 *
 * - Horizontal swipe detection (left/right)
 * - Vertical swipe detection (up/down)
 * - Velocity-based detection for natural feel
 * - Configurable thresholds (distance, velocity, angle)
 * - Gesture state tracking
 * - Multi-touch conflict detection
 *
 * ## Usage
 *
 * ```tsx
 * function MyComponent() {
 *   const { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown } = useSwipeGesture({
 *     onSwipeLeft: () => console.log('Swiped left'),
 *     onSwipeRight: () => console.log('Swiped right'),
 *     onSwipeUp: () => console.log('Swiped up'),
 *     onSwipeDown: () => console.log('Swiped down'),
 *   });
 *
 *   return (
 *     <div
 *       onTouchStart={onSwipeLeft.onTouchStart}
 *       onTouchMove={onSwipeLeft.onTouchMove}
 *       onTouchEnd={onSwipeLeft.onTouchEnd}
 *       onTouchCancel={onSwipeLeft.onTouchCancel}
 *     >
 *       Content
 *     </div>
 *   );
 * }
 * ```
 *
 * @module frontend/src/hooks/useSwipeGesture
 */

import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Swipe detection thresholds
 */
const SWIPE_MIN_DISTANCE = 50; // Minimum swipe distance in pixels
const SWIPE_MIN_VELOCITY = 0.3; // Minimum swipe velocity in pixels per millisecond
const SWIPE_ANGLE_TOLERANCE = 30; // Angle tolerance in degrees (±30° from horizontal/vertical)
const SWIPE_TIMEOUT = 300; // Maximum time for swipe detection in milliseconds

/**
 * Swipe direction
 */
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Swipe gesture state
 */
interface SwipeState {
  /** Touch start X coordinate */
  startX: number;
  /** Touch start Y coordinate */
  startY: number;
  /** Touch start timestamp */
  startTime: number;
  /** Current touch X coordinate */
  currentX: number;
  /** Current touch Y coordinate */
  currentY: number;
  /** Whether gesture is being detected */
  isDetecting: boolean;
  /** Number of active touches */
  touchCount: number;
}

/**
 * Callbacks for swipe gestures
 */
export interface SwipeCallbacks {
  /** Callback for swipe left gesture */
  onSwipeLeft?: () => void;
  /** Callback for swipe right gesture */
  onSwipeRight?: () => void;
  /** Callback for swipe up gesture */
  onSwipeUp?: () => void;
  /** Callback for swipe down gesture */
  onSwipeDown?: () => void;
  /** Optional callback when swipe detection starts */
  onSwipeStart?: () => void;
  /** Optional callback when swipe detection ends (without completing) */
  onSwipeCancel?: () => void;
  /** Optional callback during swipe with progress information */
  onSwipeProgress?: (progress: {
    dx: number;
    dy: number;
    distance: number;
    direction: SwipeDirection | null;
  }) => void;
}

/**
 * Swipe gesture handlers
 */
export interface SwipeHandlers {
  /** Touch start handler */
  onTouchStart: (event: React.TouchEvent) => void;
  /** Touch move handler */
  onTouchMove: (event: React.TouchEvent) => void;
  /** Touch end handler */
  onTouchEnd: (event: React.TouchEvent) => void;
  /** Touch cancel handler */
  onTouchCancel: (event: React.TouchEvent) => void;
  /** Whether a swipe is currently being detected */
  isDetecting: boolean;
}

/**
 * Options for swipe gesture detection
 */
export interface SwipeOptions extends SwipeCallbacks {
  /** Minimum swipe distance in pixels (default: 50) */
  minDistance?: number;
  /** Minimum swipe velocity in pixels per millisecond (default: 0.3) */
  minVelocity?: number;
  /** Angle tolerance in degrees (default: 30) */
  angleTolerance?: number;
  /** Whether to enable horizontal swipe detection (default: true) */
  enableHorizontal?: boolean;
  /** Whether to enable vertical swipe detection (default: true) */
  enableVertical?: boolean;
  /** Whether swipe detection is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Calculate angle in degrees from horizontal
 */
function calculateAngle(dx: number, dy: number): number {
  const angle = Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI);
  return angle;
}

/**
 * Determine swipe direction from delta
 */
function getSwipeDirection(
  dx: number,
  dy: number,
  angleTolerance: number,
): SwipeDirection | null {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const angle = calculateAngle(dx, dy);

  // Check if gesture is primarily horizontal
  if (absDx > absDy && angle <= angleTolerance) {
    return dx > 0 ? 'right' : 'left';
  }

  // Check if gesture is primarily vertical
  if (absDy > absDx && angle >= 90 - angleTolerance) {
    return dy > 0 ? 'down' : 'up';
  }

  return null;
}

/**
 * Hook to detect swipe gestures on touch devices
 *
 * Provides touch event handlers and state for detecting swipe gestures
 * with configurable thresholds and callbacks.
 *
 * @param options - Swipe detection options and callbacks
 * @returns Touch event handlers and detection state
 *
 * @example
 * ```tsx
 * const handlers = useSwipeGesture({
 *   onSwipeLeft: () => navigateNext(),
 *   onSwipeRight: () => navigatePrevious(),
 *   enabled: !isZoomed,
 * });
 * ```
 */
export function useSwipeGesture(options: SwipeOptions = {}): SwipeHandlers {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
    onSwipeCancel,
    onSwipeProgress,
    minDistance = SWIPE_MIN_DISTANCE,
    minVelocity = SWIPE_MIN_VELOCITY,
    angleTolerance = SWIPE_ANGLE_TOLERANCE,
    enableHorizontal = true,
    enableVertical = true,
    enabled = true,
  } = options;

  const swipeStateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    currentY: 0,
    isDetecting: false,
    touchCount: 0,
  });

  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const timeoutRef = useRef<number | null>(null);

  /**
   * Reset swipe state
   */
  const resetSwipeState = useCallback(() => {
    swipeStateRef.current = {
      startX: 0,
      startY: 0,
      startTime: 0,
      currentX: 0,
      currentY: 0,
      isDetecting: false,
      touchCount: 0,
    };
    setIsDetecting(false);
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled) {
        return;
      }

      const touches = Array.from(event.touches);

      // Only detect swipe with single touch
      if (touches.length !== 1) {
        resetSwipeState();
        return;
      }

      const touch = touches[0];
      const now = Date.now();

      swipeStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: now,
        currentX: touch.clientX,
        currentY: touch.clientY,
        isDetecting: true,
        touchCount: 1,
      };
      setIsDetecting(true);

      // Set timeout for swipe detection
      timeoutRef.current = window.setTimeout(() => {
        resetSwipeState();
        onSwipeCancel?.();
      }, SWIPE_TIMEOUT);

      onSwipeStart?.();
    },
    [enabled, resetSwipeState, onSwipeStart, onSwipeCancel],
  );

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled || !swipeStateRef.current.isDetecting) {
        return;
      }

      const touches = Array.from(event.touches);

      // Cancel if multiple touches detected
      if (touches.length !== 1) {
        resetSwipeState();
        onSwipeCancel?.();
        return;
      }

      const touch = touches[0];
      const state = swipeStateRef.current;
      state.currentX = touch.clientX;
      state.currentY = touch.clientY;

      // Calculate progress
      const dx = state.currentX - state.startX;
      const dy = state.currentY - state.startY;
      const distance = Math.hypot(dx, dy);
      const direction = getSwipeDirection(dx, dy, angleTolerance);

      // Prevent default to avoid scrolling when swipe is detected
      // Only prevent if we have sufficient movement to indicate a swipe
      if (distance > 10) {
        event.preventDefault();
      }

      // Call progress callback if provided
      if (onSwipeProgress) {
        onSwipeProgress({ dx, dy, distance, direction });
      }
    },
    [enabled, resetSwipeState, onSwipeCancel, onSwipeProgress, angleTolerance],
  );

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled || !swipeStateRef.current.isDetecting) {
        resetSwipeState();
        return;
      }

      const state = swipeStateRef.current;
      const dx = state.currentX - state.startX;
      const dy = state.currentY - state.startY;
      const distance = Math.hypot(dx, dy);
      const duration = Date.now() - state.startTime;
      const velocity = duration > 0 ? distance / duration : 0;

      // Clear timeout
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Check if swipe meets thresholds
      if (distance < minDistance || velocity < minVelocity) {
        resetSwipeState();
        onSwipeCancel?.();
        return;
      }

      // Determine swipe direction
      const direction = getSwipeDirection(dx, dy, angleTolerance);

      if (!direction) {
        resetSwipeState();
        onSwipeCancel?.();
        return;
      }

      // Execute appropriate callback
      if (direction === 'left' && enableHorizontal) {
        onSwipeLeft?.();
      } else if (direction === 'right' && enableHorizontal) {
        onSwipeRight?.();
      } else if (direction === 'up' && enableVertical) {
        onSwipeUp?.();
      } else if (direction === 'down' && enableVertical) {
        onSwipeDown?.();
      }

      resetSwipeState();
    },
    [
      enabled,
      minDistance,
      minVelocity,
      angleTolerance,
      enableHorizontal,
      enableVertical,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onSwipeCancel,
      resetSwipeState,
    ],
  );

  /**
   * Handle touch cancel
   */
  const handleTouchCancel = useCallback(() => {
    resetSwipeState();
    onSwipeCancel?.();
  }, [resetSwipeState, onSwipeCancel]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
    isDetecting,
  };
}
