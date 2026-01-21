/**
 * Image Format Detection Utilities Tests
 *
 * Tests for image format detection functions including WebP and AVIF support detection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  supportsWebP,
  supportsAVIF,
  detectWebPSupportAsync,
  detectAVIFSupportAsync,
  getBestFormat,
} from './imageFormat';

describe('imageFormat', () => {
  let mockImage: {
    onload: (() => void) | null;
    onerror: (() => void) | null;
    src: string;
  };

  beforeEach(() => {
    // Reset cache by clearing module
    vi.resetModules();

    // Mock Image constructor
    mockImage = {
      onload: null,
      onerror: null,
      src: '',
    };

    global.Image = vi.fn(() => mockImage as any) as any;
  });

  describe('supportsWebP', () => {
    it('returns false when not cached', () => {
      expect(supportsWebP()).toBe(false);
    });
  });

  describe('supportsAVIF', () => {
    it('returns false when not cached', () => {
      expect(supportsAVIF()).toBe(false);
    });
  });

  describe('detectWebPSupportAsync', () => {
    it('detects WebP support when image loads successfully', async () => {
      const promise = detectWebPSupportAsync();

      // Simulate successful load
      if (mockImage.onload) {
        mockImage.onload();
      }

      const result = await promise;
      expect(result).toBe(true);
      expect(supportsWebP()).toBe(true);
    });

    it('detects no WebP support when image fails to load', async () => {
      const promise = detectWebPSupportAsync();

      // Simulate load error
      if (mockImage.onerror) {
        mockImage.onerror();
      }

      const result = await promise;
      expect(result).toBe(false);
      expect(supportsWebP()).toBe(false);
    });

    it('uses cached result on subsequent calls', async () => {
      // First call - simulate success
      const promise1 = detectWebPSupportAsync();
      if (mockImage.onload) {
        mockImage.onload();
      }
      await promise1;

      // Second call should use cache
      const result = await detectWebPSupportAsync();
      expect(result).toBe(true);
      // Image should not be created again
      expect(global.Image).toHaveBeenCalledTimes(1);
    });

    it('returns false when canvas is not available', async () => {
      // Mock HTMLCanvasElement as undefined
      const originalCanvas = global.HTMLCanvasElement;
      (global as any).HTMLCanvasElement = undefined;

      const result = await detectWebPSupportAsync();
      expect(result).toBe(false);

      // Restore
      global.HTMLCanvasElement = originalCanvas;
    });
  });

  describe('detectAVIFSupportAsync', () => {
    it('detects AVIF support when image loads successfully', async () => {
      const promise = detectAVIFSupportAsync();

      // Simulate successful load
      if (mockImage.onload) {
        mockImage.onload();
      }

      const result = await promise;
      expect(result).toBe(true);
      expect(supportsAVIF()).toBe(true);
    });

    it('detects no AVIF support when image fails to load', async () => {
      const promise = detectAVIFSupportAsync();

      // Simulate load error
      if (mockImage.onerror) {
        mockImage.onerror();
      }

      const result = await promise;
      expect(result).toBe(false);
      expect(supportsAVIF()).toBe(false);
    });

    it('uses cached result on subsequent calls', async () => {
      // First call - simulate success
      const promise1 = detectAVIFSupportAsync();
      if (mockImage.onload) {
        mockImage.onload();
      }
      await promise1;

      // Second call should use cache
      const result = await detectAVIFSupportAsync();
      expect(result).toBe(true);
    });
  });

  describe('getBestFormat', () => {
    it('returns avif when AVIF is supported', async () => {
      // Mock AVIF support
      const promise = detectAVIFSupportAsync();
      if (mockImage.onload) {
        mockImage.onload();
      }
      await promise;

      const format = await getBestFormat();
      expect(format).toBe('avif');
    });

    it('returns webp when WebP is supported but AVIF is not', async () => {
      // Mock AVIF failure
      const avifPromise = detectAVIFSupportAsync();
      if (mockImage.onerror) {
        mockImage.onerror();
      }
      await avifPromise;

      // Mock WebP success
      const webpPromise = detectWebPSupportAsync();
      if (mockImage.onload) {
        mockImage.onload();
      }
      await webpPromise;

      const format = await getBestFormat();
      expect(format).toBe('webp');
    });

    it('returns original when neither format is supported', async () => {
      // Mock both failures
      const avifPromise = detectAVIFSupportAsync();
      if (mockImage.onerror) {
        mockImage.onerror();
      }
      await avifPromise;

      const webpPromise = detectWebPSupportAsync();
      if (mockImage.onerror) {
        mockImage.onerror();
      }
      await webpPromise;

      const format = await getBestFormat();
      expect(format).toBe('original');
    });
  });
});
