/**
 * Image Format Detection Utilities Tests
 *
 * Tests for image format detection functions including WebP and AVIF support detection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// We use dynamic imports after vi.resetModules() to get a fresh module each test.
type ImageFormatModule = typeof import('./imageFormat');

describe('imageFormat', () => {
  let mockImage: {
    onload: (() => void) | null;
    onerror: (() => void) | null;
    src: string;
  };

  let mod: ImageFormatModule;

  beforeEach(async () => {
    // Reset module registry so the module-level cache is recreated
    vi.resetModules();

    // Mock Image constructor
    mockImage = {
      onload: null,
      onerror: null,
      src: '',
    };

    global.Image = vi.fn(function () { return mockImage as any; }) as any;

    // Dynamically import a fresh copy of the module
    mod = await import('./imageFormat');
  });

  describe('supportsWebP', () => {
    it('returns false when not cached', () => {
      expect(mod.supportsWebP()).toBe(false);
    });
  });

  describe('supportsAVIF', () => {
    it('returns false when not cached', () => {
      expect(mod.supportsAVIF()).toBe(false);
    });
  });

  describe('detectWebPSupportAsync', () => {
    it('detects WebP support when image loads successfully', async () => {
      const promise = mod.detectWebPSupportAsync();

      // Simulate successful load
      if (mockImage.onload) {
        mockImage.onload();
      }

      const result = await promise;
      expect(result).toBe(true);
      expect(mod.supportsWebP()).toBe(true);
    });

    it('detects no WebP support when image fails to load', async () => {
      const promise = mod.detectWebPSupportAsync();

      // Simulate load error
      if (mockImage.onerror) {
        mockImage.onerror();
      }

      const result = await promise;
      expect(result).toBe(false);
      expect(mod.supportsWebP()).toBe(false);
    });

    it('uses cached result on subsequent calls', async () => {
      // First call - simulate success
      const promise1 = mod.detectWebPSupportAsync();
      if (mockImage.onload) {
        mockImage.onload();
      }
      await promise1;

      // Second call should use cache
      const result = await mod.detectWebPSupportAsync();
      expect(result).toBe(true);
      // Image should not be created again
      expect(global.Image).toHaveBeenCalledTimes(1);
    });

    it('returns false when canvas is not available', async () => {
      // Mock HTMLCanvasElement as undefined
      const originalCanvas = global.HTMLCanvasElement;
      (global as any).HTMLCanvasElement = undefined;

      // Need a fresh module import after changing HTMLCanvasElement
      vi.resetModules();
      const freshMod: ImageFormatModule = await import('./imageFormat');

      const result = await freshMod.detectWebPSupportAsync();
      expect(result).toBe(false);

      // Restore
      global.HTMLCanvasElement = originalCanvas;
    });
  });

  describe('detectAVIFSupportAsync', () => {
    it('detects AVIF support when image loads successfully', async () => {
      const promise = mod.detectAVIFSupportAsync();

      // Simulate successful load
      if (mockImage.onload) {
        mockImage.onload();
      }

      const result = await promise;
      expect(result).toBe(true);
      expect(mod.supportsAVIF()).toBe(true);
    });

    it('detects no AVIF support when image fails to load', async () => {
      const promise = mod.detectAVIFSupportAsync();

      // Simulate load error
      if (mockImage.onerror) {
        mockImage.onerror();
      }

      const result = await promise;
      expect(result).toBe(false);
      expect(mod.supportsAVIF()).toBe(false);
    });

    it('uses cached result on subsequent calls', async () => {
      // First call - simulate success
      const promise1 = mod.detectAVIFSupportAsync();
      if (mockImage.onload) {
        mockImage.onload();
      }
      await promise1;

      // Second call should use cache
      const result = await mod.detectAVIFSupportAsync();
      expect(result).toBe(true);
    });
  });

  describe('getBestFormat', () => {
    it('returns avif when AVIF is supported', async () => {
      // Mock AVIF support - detectAVIFSupportAsync creates an Image
      const promise = mod.detectAVIFSupportAsync();
      if (mockImage.onload) {
        mockImage.onload();
      }
      await promise;

      const format = await mod.getBestFormat();
      expect(format).toBe('avif');
    });

    it('returns webp when WebP is supported but AVIF is not', async () => {
      // Mock AVIF failure
      const avifPromise = mod.detectAVIFSupportAsync();
      if (mockImage.onerror) {
        mockImage.onerror();
      }
      await avifPromise;

      // Reset mockImage for next Image() call
      mockImage = {
        onload: null,
        onerror: null,
        src: '',
      };
      global.Image = vi.fn(function () { return mockImage as any; }) as any;

      // Mock WebP success
      const webpPromise = mod.detectWebPSupportAsync();
      if (mockImage.onload) {
        mockImage.onload();
      }
      await webpPromise;

      const format = await mod.getBestFormat();
      expect(format).toBe('webp');
    });

    it('returns original when neither format is supported', async () => {
      // Mock AVIF failure
      const avifPromise = mod.detectAVIFSupportAsync();
      if (mockImage.onerror) {
        mockImage.onerror();
      }
      await avifPromise;

      // Reset mockImage for next Image() call
      mockImage = {
        onload: null,
        onerror: null,
        src: '',
      };
      global.Image = vi.fn(function () { return mockImage as any; }) as any;

      // Mock WebP failure
      const webpPromise = mod.detectWebPSupportAsync();
      if (mockImage.onerror) {
        mockImage.onerror();
      }
      await webpPromise;

      const format = await mod.getBestFormat();
      expect(format).toBe('original');
    });
  });
});
