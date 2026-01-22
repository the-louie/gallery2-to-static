/**
 * Touch Event Test Utilities
 *
 * Helper functions for simulating touch events in tests.
 * Provides utilities for creating touch events and simulating gestures.
 *
 * @module frontend/src/test-utils/touch-events
 */

/**
 * Create a Touch object for testing
 */
export function createTouch(
  identifier: number,
  target: EventTarget,
  clientX: number,
  clientY: number,
  pageX?: number,
  pageY?: number,
): Touch {
  return {
    identifier,
    target,
    clientX,
    clientY,
    pageX: pageX ?? clientX,
    pageY: pageY ?? clientY,
    screenX: clientX,
    screenY: clientY,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 0,
  } as Touch;
}

/**
 * Create a TouchList from an array of Touch objects
 */
export function createTouchList(touches: Touch[]): TouchList {
  const touchList = touches as unknown as TouchList;
  touchList.item = (index: number) => touches[index] || null;
  touchList.length = touches.length;
  return touchList;
}

/**
 * Create a TouchEvent for testing
 */
export function createTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  touches: Touch[],
  targetTouches?: Touch[],
  changedTouches?: Touch[],
): TouchEvent {
  const touchList = createTouchList(touches);
  const targetTouchList = targetTouches
    ? createTouchList(targetTouches)
    : touchList;
  const changedTouchList = changedTouches
    ? createTouchList(changedTouches)
    : touchList;

  return new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: touchList,
    targetTouches: targetTouchList,
    changedTouches: changedTouchList,
  } as TouchEventInit);
}

/**
 * Create a touchstart event
 */
export function createTouchStart(
  target: EventTarget,
  touches: Array<{ identifier: number; clientX: number; clientY: number }>,
): TouchEvent {
  const touchObjects = touches.map((t) =>
    createTouch(t.identifier, target, t.clientX, t.clientY),
  );
  return createTouchEvent('touchstart', touchObjects, touchObjects, touchObjects);
}

/**
 * Create a touchmove event
 */
export function createTouchMove(
  target: EventTarget,
  touches: Array<{ identifier: number; clientX: number; clientY: number }>,
): TouchEvent {
  const touchObjects = touches.map((t) =>
    createTouch(t.identifier, target, t.clientX, t.clientY),
  );
  return createTouchEvent('touchmove', touchObjects, touchObjects, touchObjects);
}

/**
 * Create a touchend event
 */
export function createTouchEnd(
  target: EventTarget,
  touches: Array<{ identifier: number; clientX: number; clientY: number }>,
  changedTouches: Array<{ identifier: number; clientX: number; clientY: number }>,
): TouchEvent {
  const touchObjects = touches.map((t) =>
    createTouch(t.identifier, target, t.clientX, t.clientY),
  );
  const changedTouchObjects = changedTouches.map((t) =>
    createTouch(t.identifier, target, t.clientX, t.clientY),
  );
  return createTouchEvent(
    'touchend',
    touchObjects,
    touchObjects,
    changedTouchObjects,
  );
}

/**
 * Create a touchcancel event
 */
export function createTouchCancel(
  target: EventTarget,
  touches: Array<{ identifier: number; clientX: number; clientY: number }>,
): TouchEvent {
  const touchObjects = touches.map((t) =>
    createTouch(t.identifier, target, t.clientX, t.clientY),
  );
  return createTouchEvent('touchcancel', touchObjects, touchObjects, touchObjects);
}

/**
 * Simulate a swipe gesture
 */
export function simulateSwipe(
  element: HTMLElement,
  options: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    duration?: number;
    steps?: number;
  },
): void {
  const { startX, startY, endX, endY, duration = 300, steps = 10 } = options;
  const dx = endX - startX;
  const dy = endY - startY;
  const stepTime = duration / steps;

  // Touch start
  const startEvent = createTouchStart(element, [
    { identifier: 1, clientX: startX, clientY: startY },
  ]);
  element.dispatchEvent(startEvent);

  // Touch move steps
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const currentX = startX + dx * progress;
    const currentY = startY + dy * progress;

    setTimeout(() => {
      const moveEvent = createTouchMove(element, [
        { identifier: 1, clientX: currentX, clientY: currentY },
      ]);
      element.dispatchEvent(moveEvent);
    }, stepTime * i);
  }

  // Touch end
  setTimeout(() => {
    const endEvent = createTouchEnd(
      element,
      [{ identifier: 1, clientX: endX, clientY: endY }],
      [{ identifier: 1, clientX: endX, clientY: endY }],
    );
    element.dispatchEvent(endEvent);
  }, duration);
}

/**
 * Simulate a pinch zoom gesture
 */
export function simulatePinch(
  element: HTMLElement,
  options: {
    centerX: number;
    centerY: number;
    startDistance: number;
    endDistance: number;
    duration?: number;
    steps?: number;
  },
): void {
  const {
    centerX,
    centerY,
    startDistance,
    endDistance,
    duration = 300,
    steps = 10,
  } = options;
  const distanceDelta = endDistance - startDistance;
  const stepTime = duration / steps;

  // Calculate initial touch positions
  const startX1 = centerX - startDistance / 2;
  const startY1 = centerY;
  const startX2 = centerX + startDistance / 2;
  const startY2 = centerY;

  // Touch start with two touches
  const startEvent = createTouchStart(element, [
    { identifier: 1, clientX: startX1, clientY: startY1 },
    { identifier: 2, clientX: startX2, clientY: startY2 },
  ]);
  element.dispatchEvent(startEvent);

  // Touch move steps
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const currentDistance = startDistance + distanceDelta * progress;
    const currentX1 = centerX - currentDistance / 2;
    const currentX2 = centerX + currentDistance / 2;

    setTimeout(() => {
      const moveEvent = createTouchMove(element, [
        { identifier: 1, clientX: currentX1, clientY: startY1 },
        { identifier: 2, clientX: currentX2, clientY: startY2 },
      ]);
      element.dispatchEvent(moveEvent);
    }, stepTime * i);
  }

  // Touch end
  setTimeout(() => {
    const endDistance = startDistance + distanceDelta;
    const endX1 = centerX - endDistance / 2;
    const endX2 = centerX + endDistance / 2;
    const endEvent = createTouchEnd(
      element,
      [
        { identifier: 1, clientX: endX1, clientY: startY1 },
        { identifier: 2, clientX: endX2, clientY: startY2 },
      ],
      [
        { identifier: 1, clientX: endX1, clientY: startY1 },
        { identifier: 2, clientX: endX2, clientY: startY2 },
      ],
    );
    element.dispatchEvent(endEvent);
  }, duration);
}

/**
 * Simulate a pan gesture
 */
export function simulatePan(
  element: HTMLElement,
  options: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    duration?: number;
    steps?: number;
  },
): void {
  // Pan is similar to swipe but typically used when zoomed
  simulateSwipe(element, options);
}
