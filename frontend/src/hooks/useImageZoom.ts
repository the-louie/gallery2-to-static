/**
 * React hook for managing image zoom and pan state
 *
 * Provides zoom and pan functionality for images with zoom limits, boundary
 * constraints, and smooth state management. Supports zoom in/out, pan, and reset
 * operations with proper boundary checking.
 *
 * ## Features
 *
 * - Zoom level management (percentage, default 100%)
 * - Pan position management (x, y coordinates)
 * - Zoom limits (min 100%, max 400% or fit-to-screen)
 * - Pan boundary constraints (prevent panning beyond image edges)
 * - Zoom center point calculation
 * - State reset when image changes
 *
 * ## Usage
 *
 * ```tsx
 * function Lightbox({ image }: Props) {
 *   const { zoom, pan, zoomIn, zoomOut, resetZoom, setPan } = useImageZoom(
 *     image?.width || 0,
 *     image?.height || 0
 *   );
 *
 *   return (
 *     <img
 *       style={{
 *         transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
 *       }}
 *     />
 *   );
 * }
 * ```
 *
 * @module frontend/src/hooks/useImageZoom
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Zoom limits configuration
 */
const ZOOM_MIN = 100; // Minimum zoom level (100%)
const ZOOM_MAX = 400; // Maximum zoom level (400%)
const ZOOM_STEP = 25; // Zoom step size for zoom in/out buttons

/**
 * Pan position coordinates
 */
export interface PanPosition {
  /** X coordinate (horizontal pan) */
  x: number;
  /** Y coordinate (vertical pan) */
  y: number;
}

/**
 * Return type for useImageZoom hook
 */
export interface UseImageZoomReturn {
  /** Current zoom level as percentage (100 = 100%, 200 = 200%, etc.) */
  zoom: number;
  /** Current pan position */
  pan: PanPosition;
  /** Whether zoom can be increased (not at max) */
  canZoomIn: boolean;
  /** Whether zoom can be decreased (not at min) */
  canZoomOut: boolean;
  /** Whether image is zoomed (zoom > 100%) */
  isZoomed: boolean;
  /** Function to zoom in by step size */
  zoomIn: (centerX?: number, centerY?: number) => void;
  /** Function to zoom out by step size */
  zoomOut: (centerX?: number, centerY?: number) => void;
  /** Function to set zoom level directly */
  setZoom: (zoom: number, centerX?: number, centerY?: number) => void;
  /** Function to reset zoom to 100% */
  resetZoom: () => void;
  /** Function to set pan position */
  setPan: (x: number, y: number) => void;
  /** Function to reset pan to center */
  resetPan: () => void;
  /** Function to constrain pan to image boundaries */
  constrainPan: () => void;
}

/**
 * Hook to manage image zoom and pan state
 *
 * Manages zoom level and pan position for an image with proper boundary
 * constraints. Automatically resets when image dimensions change.
 *
 * @param imageWidth - Width of the image in pixels
 * @param imageHeight - Height of the image in pixels
 * @param containerWidth - Width of the container/viewport in pixels (optional, for fit-to-screen calculation)
 * @param containerHeight - Height of the container/viewport in pixels (optional, for fit-to-screen calculation)
 * @returns Object with zoom state and control functions
 *
 * @example
 * ```tsx
 * const { zoom, pan, zoomIn, zoomOut, resetZoom } = useImageZoom(
 *   image.width || 0,
 *   image.height || 0
 * );
 * ```
 */
export function useImageZoom(
  imageWidth: number,
  imageHeight: number,
  containerWidth?: number,
  containerHeight?: number,
): UseImageZoomReturn {
  // Zoom level state (percentage, default 100%)
  const [zoom, setZoomState] = useState<number>(100);

  // Pan position state (x, y coordinates, default centered)
  const [pan, setPanState] = useState<PanPosition>({ x: 0, y: 0 });

  // Calculate maximum zoom based on fit-to-screen or fixed max
  const maxZoom = useMemo(() => {
    if (containerWidth && containerHeight && imageWidth > 0 && imageHeight > 0) {
      // Calculate fit-to-screen zoom
      const scaleX = (containerWidth / imageWidth) * 100;
      const scaleY = (containerHeight / imageHeight) * 100;
      const fitZoom = Math.min(scaleX, scaleY) * 100;
      // Use the larger of fit-to-screen or fixed max
      return Math.max(fitZoom, ZOOM_MAX);
    }
    return ZOOM_MAX;
  }, [imageWidth, imageHeight, containerWidth, containerHeight]);

  // Reset zoom and pan when image dimensions change
  useEffect(() => {
    setZoomState(100);
    setPanState({ x: 0, y: 0 });
  }, [imageWidth, imageHeight]);

  // Calculate zoom limits
  const canZoomIn = useMemo(() => zoom < maxZoom, [zoom, maxZoom]);
  const canZoomOut = useMemo(() => zoom > ZOOM_MIN, [zoom]);
  const isZoomed = useMemo(() => zoom > ZOOM_MIN, [zoom]);

  // Calculate pan boundaries based on current zoom and image dimensions
  const panBoundaries = useMemo(() => {
    if (imageWidth === 0 || imageHeight === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const zoomFactor = zoom / 100;
    const scaledWidth = imageWidth * zoomFactor;
    const scaledHeight = imageHeight * zoomFactor;

    // Use container dimensions if provided and valid, otherwise use image dimensions (no constraint)
    const effectiveContainerWidth = (containerWidth && containerWidth > 0) ? containerWidth : imageWidth;
    const effectiveContainerHeight = (containerHeight && containerHeight > 0) ? containerHeight : imageHeight;

    // Calculate how much the image extends beyond the container
    const overflowX = Math.max(0, scaledWidth - effectiveContainerWidth);
    const overflowY = Math.max(0, scaledHeight - effectiveContainerHeight);

    return {
      minX: -overflowX / 2,
      maxX: overflowX / 2,
      minY: -overflowY / 2,
      maxY: overflowY / 2,
    };
  }, [zoom, imageWidth, imageHeight, containerWidth, containerHeight]);

  // Constrain pan position to boundaries
  const constrainPan = useCallback(() => {
    setPanState((currentPan) => {
      const { minX, maxX, minY, maxY } = panBoundaries;
      return {
        x: Math.max(minX, Math.min(maxX, currentPan.x)),
        y: Math.max(minY, Math.min(maxY, currentPan.y)),
      };
    });
  }, [panBoundaries]);

  // Set pan position with boundary constraints
  const setPan = useCallback(
    (x: number, y: number) => {
      const { minX, maxX, minY, maxY } = panBoundaries;
      setPanState({
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y)),
      });
    },
    [panBoundaries],
  );

  // Reset pan to center
  const resetPan = useCallback(() => {
    setPanState({ x: 0, y: 0 });
  }, []);

  // Calculate zoom center point adjustment for pan
  const adjustPanForZoomCenter = useCallback(
    (
      oldZoom: number,
      newZoom: number,
      centerX?: number,
      centerY?: number,
      currentPan?: PanPosition,
    ) => {
      if (!centerX || !centerY || imageWidth === 0 || imageHeight === 0) {
        return;
      }

      const panX = currentPan?.x ?? pan.x;
      const panY = currentPan?.y ?? pan.y;

      // Calculate the point in image coordinates that should remain fixed
      // Center point is relative to container, need to account for current pan
      const zoomFactor = oldZoom / 100;
      const containerCenterX = (containerWidth || imageWidth) / 2;
      const containerCenterY = (containerHeight || imageHeight) / 2;

      // Convert screen coordinates to image coordinates
      const imageX = (centerX - containerCenterX - panX) / zoomFactor;
      const imageY = (centerY - containerCenterY - panY) / zoomFactor;

      // Calculate new pan to keep that point fixed
      const newZoomFactor = newZoom / 100;
      const newPanX = centerX - containerCenterX - imageX * newZoomFactor;
      const newPanY = centerY - containerCenterY - imageY * newZoomFactor;

      setPan(newPanX, newPanY);
    },
    [imageWidth, imageHeight, containerWidth, containerHeight, pan, setPan],
  );

  // Set zoom level directly
  const setZoom = useCallback(
    (newZoom: number, centerX?: number, centerY?: number) => {
      setZoomState((currentZoom) => {
        const clampedZoom = Math.max(ZOOM_MIN, Math.min(maxZoom, newZoom));

        // Adjust pan to keep zoom center point fixed
        // Schedule pan adjustment after state update completes
        if (centerX !== undefined && centerY !== undefined && currentZoom !== clampedZoom) {
          // Use requestAnimationFrame to ensure state update completes first
          // Get current pan state when the frame executes to avoid stale closure
          requestAnimationFrame(() => {
            setPanState((currentPan) => {
              // Calculate pan adjustment with current pan state
              if (!centerX || !centerY || imageWidth === 0 || imageHeight === 0) {
                return currentPan;
              }

              const zoomFactor = currentZoom / 100;
              const containerCenterX = (containerWidth || imageWidth) / 2;
              const containerCenterY = (containerHeight || imageHeight) / 2;

              // Convert screen coordinates to image coordinates
              const imageX = (centerX - containerCenterX - currentPan.x) / zoomFactor;
              const imageY = (centerY - containerCenterY - currentPan.y) / zoomFactor;

              // Calculate new pan to keep that point fixed
              const newZoomFactor = clampedZoom / 100;
              const newPanX = centerX - containerCenterX - imageX * newZoomFactor;
              const newPanY = centerY - containerCenterY - imageY * newZoomFactor;

              // Calculate pan boundaries for the new zoom level (not the old one)
              const scaledWidth = imageWidth * newZoomFactor;
              const scaledHeight = imageHeight * newZoomFactor;
              const effectiveContainerWidth = (containerWidth && containerWidth > 0) ? containerWidth : imageWidth;
              const effectiveContainerHeight = (containerHeight && containerHeight > 0) ? containerHeight : imageHeight;
              const overflowX = Math.max(0, scaledWidth - effectiveContainerWidth);
              const overflowY = Math.max(0, scaledHeight - effectiveContainerHeight);
              const minX = -overflowX / 2;
              const maxX = overflowX / 2;
              const minY = -overflowY / 2;
              const maxY = overflowY / 2;

              // Apply boundary constraints
              return {
                x: Math.max(minX, Math.min(maxX, newPanX)),
                y: Math.max(minY, Math.min(maxY, newPanY)),
              };
            });
            // Constrain pan after adjustment (double-check)
            requestAnimationFrame(() => {
              constrainPan();
            });
          });
        } else {
          // Constrain pan after zoom change
          requestAnimationFrame(() => {
            constrainPan();
          });
        }

        return clampedZoom;
      });
    },
    [maxZoom, imageWidth, imageHeight, containerWidth, containerHeight, constrainPan],
  );

  // Zoom in by step size
  const zoomIn = useCallback(
    (centerX?: number, centerY?: number) => {
      if (!canZoomIn) {
        return;
      }
      const newZoom = Math.min(maxZoom, zoom + ZOOM_STEP);
      setZoom(newZoom, centerX, centerY);
    },
    [zoom, maxZoom, canZoomIn, setZoom],
  );

  // Zoom out by step size
  const zoomOut = useCallback(
    (centerX?: number, centerY?: number) => {
      if (!canZoomOut) {
        return;
      }
      const newZoom = Math.max(ZOOM_MIN, zoom - ZOOM_STEP);
      setZoom(newZoom, centerX, centerY);
    },
    [zoom, canZoomOut, setZoom],
  );

  // Reset zoom to 100%
  const resetZoom = useCallback(() => {
    setZoomState(ZOOM_MIN);
    resetPan();
  }, [resetPan]);

  return {
    zoom,
    pan,
    canZoomIn,
    canZoomOut,
    isZoomed,
    zoomIn,
    zoomOut,
    setZoom,
    resetZoom,
    setPan,
    resetPan,
    constrainPan,
  };
}
