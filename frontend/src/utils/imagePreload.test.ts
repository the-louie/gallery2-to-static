/**
 * Tests for image preloading utility
 *
 * @module frontend/src/utils/imagePreload
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { preloadImage, preloadImages } from './imagePreload';

describe('imagePreload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('preloadImage', () => {
    it('preloads an image successfully', async () => {
      const mockImage = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        src: '',
      };

      // Mock Image constructor
      global.Image = vi.fn(() => mockImage as unknown as HTMLImageElement) as unknown as typeof Image;

      const url = '/images/test.jpg';
      const preloadPromise = preloadImage(url);

      // Simulate successful load
      if (mockImage.onload) {
        mockImage.onload();
      }

      await expect(preloadPromise).resolves.toBeUndefined();
      expect(mockImage.src).toBe(url);
    });

    it('rejects on image load error', async () => {
      const mockImage = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        src: '',
      };

      global.Image = vi.fn(() => mockImage as unknown as HTMLImageElement) as unknown as typeof Image;

      const url = '/images/test.jpg';
      const preloadPromise = preloadImage(url);

      // Simulate error
      if (mockImage.onerror) {
        mockImage.onerror();
      }

      await expect(preloadPromise).rejects.toThrow('Failed to preload image');
      expect(mockImage.src).toBe(url);
    });

    it('rejects when URL is empty', async () => {
      await expect(preloadImage('')).rejects.toThrow('Image URL is required');
    });

    it('rejects when URL is not provided', async () => {
      // @ts-expect-error - Testing invalid input
      await expect(preloadImage(null)).rejects.toThrow();
    });
  });

  describe('preloadImages', () => {
    it('preloads multiple images successfully', async () => {
      const mockImages: Array<{
        onload: (() => void) | null;
        onerror: (() => void) | null;
        src: string;
      }> = [
        { onload: null, onerror: null, src: '' },
        { onload: null, onerror: null, src: '' },
      ];

      let imageIndex = 0;
      global.Image = vi.fn(() => {
        const img = mockImages[imageIndex];
        imageIndex++;
        return img as unknown as HTMLImageElement;
      }) as unknown as typeof Image;

      const urls = ['/images/test1.jpg', '/images/test2.jpg'];
      const preloadPromise = preloadImages(urls);

      // Simulate successful loads
      mockImages.forEach((img) => {
        if (img.onload) {
          img.onload();
        }
      });

      await expect(preloadPromise).resolves.toBeUndefined();
      expect(mockImages[0].src).toBe(urls[0]);
      expect(mockImages[1].src).toBe(urls[1]);
    });

    it('rejects when any image fails to load', async () => {
      const mockImages: Array<{
        onload: (() => void) | null;
        onerror: (() => void) | null;
        src: string;
      }> = [
        { onload: null, onerror: null, src: '' },
        { onload: null, onerror: null, src: '' },
      ];

      let imageIndex = 0;
      global.Image = vi.fn(() => {
        const img = mockImages[imageIndex];
        imageIndex++;
        return img as unknown as HTMLImageElement;
      }) as unknown as typeof Image;

      const urls = ['/images/test1.jpg', '/images/test2.jpg'];
      const preloadPromise = preloadImages(urls);

      // First image loads successfully
      if (mockImages[0].onload) {
        mockImages[0].onload();
      }

      // Second image fails
      if (mockImages[1].onerror) {
        mockImages[1].onerror();
      }

      await expect(preloadPromise).rejects.toThrow();
    });

    it('resolves immediately for empty array', async () => {
      await expect(preloadImages([])).resolves.toBeUndefined();
    });
  });
});
