/**
 * useImageZoom Hook Tests
 *
 * Tests for the useImageZoom hook covering zoom state management, pan functionality,
 * boundary constraints, and state reset.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImageZoom } from './useImageZoom';

describe('useImageZoom', () => {
  const imageWidth = 1920;
  const imageHeight = 1080;
  const containerWidth = 800;
  const containerHeight = 600;

  describe('Initial State', () => {
    it('initializes with default zoom of 100%', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight),
      );

      expect(result.current.zoom).toBe(100);
      expect(result.current.pan).toEqual({ x: 0, y: 0 });
      expect(result.current.isZoomed).toBe(false);
    });

    it('initializes with correct zoom limits', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight),
      );

      expect(result.current.canZoomIn).toBe(true);
      expect(result.current.canZoomOut).toBe(false);
    });
  });

  describe('Zoom In', () => {
    it('increases zoom by step size', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight),
      );

      act(() => {
        result.current.zoomIn();
      });

      expect(result.current.zoom).toBe(125);
      expect(result.current.isZoomed).toBe(true);
    });

    it('respects max zoom limit', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight),
      );

      // Zoom to max
      act(() => {
        for (let i = 0; i < 20; i++) {
          result.current.zoomIn();
        }
      });

      expect(result.current.zoom).toBeLessThanOrEqual(400);
      expect(result.current.canZoomIn).toBe(false);
    });

    it('does not zoom in when at max', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight),
      );

      // Zoom to max
      act(() => {
        for (let i = 0; i < 20; i++) {
          result.current.zoomIn();
        }
      });

      const maxZoom = result.current.zoom;

      act(() => {
        result.current.zoomIn();
      });

      expect(result.current.zoom).toBe(maxZoom);
    });
  });

  describe('Zoom Out', () => {
    it('decreases zoom by step size', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight),
      );

      act(() => {
        result.current.zoomIn();
        result.current.zoomIn();
      });

      act(() => {
        result.current.zoomOut();
      });

      expect(result.current.zoom).toBe(125);
    });

    it('respects min zoom limit', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight),
      );

      act(() => {
        result.current.zoomOut();
      });

      expect(result.current.zoom).toBe(100);
      expect(result.current.canZoomOut).toBe(false);
    });
  });

  describe('Reset Zoom', () => {
    it('resets zoom to 100%', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight),
      );

      act(() => {
        result.current.zoomIn();
        result.current.zoomIn();
      });

      act(() => {
        result.current.resetZoom();
      });

      expect(result.current.zoom).toBe(100);
      expect(result.current.isZoomed).toBe(false);
    });

    it('resets pan when resetting zoom', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight),
      );

      act(() => {
        result.current.zoomIn();
        result.current.setPan(100, 100);
      });

      act(() => {
        result.current.resetZoom();
      });

      expect(result.current.pan).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Set Zoom', () => {
    it('sets zoom to specified level', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight),
      );

      act(() => {
        result.current.setZoom(200);
      });

      expect(result.current.zoom).toBe(200);
    });

    it('clamps zoom to min limit', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight),
      );

      act(() => {
        result.current.setZoom(50);
      });

      expect(result.current.zoom).toBe(100);
    });

    it('clamps zoom to max limit', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight),
      );

      act(() => {
        result.current.setZoom(500);
      });

      expect(result.current.zoom).toBeLessThanOrEqual(400);
    });
  });

  describe('Pan Functionality', () => {
    it('sets pan position', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight, containerWidth, containerHeight),
      );

      act(() => {
        result.current.zoomIn();
        result.current.setPan(50, 50);
      });

      expect(result.current.pan.x).toBe(50);
      expect(result.current.pan.y).toBe(50);
    });

    it('constrains pan to boundaries', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight, containerWidth, containerHeight),
      );

      act(() => {
        result.current.zoomIn();
        result.current.setPan(10000, 10000);
      });

      // Pan should be constrained
      expect(result.current.pan.x).toBeLessThan(10000);
      expect(result.current.pan.y).toBeLessThan(10000);
    });

    it('resets pan to center', () => {
      const { result } = renderHook(() =>
        useImageZoom(imageWidth, imageHeight),
      );

      act(() => {
        result.current.setPan(100, 100);
      });

      act(() => {
        result.current.resetPan();
      });

      expect(result.current.pan).toEqual({ x: 0, y: 0 });
    });
  });

  describe('State Reset on Image Change', () => {
    it('resets zoom when image dimensions change', () => {
      const { result, rerender } = renderHook(
        ({ width, height }) => useImageZoom(width, height),
        {
          initialProps: { width: imageWidth, height: imageHeight },
        },
      );

      act(() => {
        result.current.zoomIn();
      });

      rerender({ width: 800, height: 600 });

      expect(result.current.zoom).toBe(100);
      expect(result.current.pan).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Edge Cases', () => {
    it('handles zero image dimensions', () => {
      const { result } = renderHook(() => useImageZoom(0, 0));

      expect(result.current.zoom).toBe(100);
      expect(result.current.pan).toEqual({ x: 0, y: 0 });
    });

    it('handles very small images', () => {
      const { result } = renderHook(() => useImageZoom(10, 10));

      expect(result.current.zoom).toBe(100);
      expect(result.current.canZoomIn).toBe(true);
    });

    it('handles very large images', () => {
      const { result } = renderHook(() => useImageZoom(10000, 10000));

      expect(result.current.zoom).toBe(100);
      expect(result.current.canZoomIn).toBe(true);
    });
  });
});
