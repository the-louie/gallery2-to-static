/**
 * Tests for image preloading utility
 *
 * @module frontend/src/utils/imagePreload
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  preloadImage,
  preloadImages,
  MAX_CONCURRENT_PRELOADS,
} from './imagePreload';
import { resetImageCache, getImageCache } from './imageCache';

vi.mock('./fetchImageAsObjectUrl', () => ({
  fetchImageAsObjectUrl: vi.fn(),
}));

describe('imagePreload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetImageCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetImageCache();
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

    it('returns immediately if image is cached', async () => {
      const cache = getImageCache();
      const img = new Image();
      img.src = '/images/cached.jpg';
      cache.set('/images/cached.jpg', img);

      // Should resolve immediately without creating new Image
      const preloadPromise = preloadImage('/images/cached.jpg');
      await expect(preloadPromise).resolves.toBeUndefined();
    });

    it('stores loaded image in cache', async () => {
      const mockImage = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        src: '',
      };

      global.Image = vi.fn(() => mockImage as unknown as HTMLImageElement) as unknown as typeof Image;

      const url = '/images/test.jpg';
      const cache = getImageCache();
      expect(cache.has(url)).toBe(false);

      const preloadPromise = preloadImage(url);

      // Simulate successful load
      if (mockImage.onload) {
        mockImage.onload();
      }

      await expect(preloadPromise).resolves.toBeUndefined();
      expect(cache.has(url)).toBe(true);
    });

    it('with signal: rejects with AbortError when signal aborted and does not add to cache', async () => {
      const { fetchImageAsObjectUrl } = await import('./fetchImageAsObjectUrl');
      const controller = new AbortController();
      vi.mocked(fetchImageAsObjectUrl).mockImplementation(
        () =>
          new Promise((_, reject) => {
            controller.abort();
            reject(new DOMException('Aborted', 'AbortError'));
          }),
      );

      const url = '/images/aborted.jpg';
      const cache = getImageCache();

      await expect(preloadImage(url, { signal: controller.signal })).rejects.toMatchObject({
        name: 'AbortError',
      });

      expect(cache.has(url)).toBe(false);
    });

    it('with signal: uses fetch and resolves when load succeeds', async () => {
      const { fetchImageAsObjectUrl } = await import('./fetchImageAsObjectUrl');
      const controller = new AbortController();
      const objectUrl = 'blob:http://localhost/abc';
      vi.mocked(fetchImageAsObjectUrl).mockResolvedValue(objectUrl);

      const mockImage = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        src: '',
      };
      global.Image = vi.fn(() => mockImage as unknown as HTMLImageElement) as unknown as typeof Image;

      const url = '/images/fetched.jpg';
      const p = preloadImage(url, { signal: controller.signal });

      await Promise.resolve();
      if (mockImage.onload) {
        mockImage.onload();
      }

      await expect(p).resolves.toBeUndefined();
      expect(fetchImageAsObjectUrl).toHaveBeenCalledWith(url, controller.signal);
      expect(getImageCache().has(url)).toBe(true);
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

    it('exports MAX_CONCURRENT_PRELOADS constant', () => {
      expect(MAX_CONCURRENT_PRELOADS).toBe(4);
      expect(typeof MAX_CONCURRENT_PRELOADS).toBe('number');
    });

    it('limits concurrent preloads to MAX_CONCURRENT_PRELOADS', async () => {
      let activeFetches = 0;
      let maxActiveFetches = 0;
      const resolvers: Array<() => void> = [];

      global.Image = vi.fn(() => {
        const img = {
          onload: null as (() => void) | null,
          onerror: null as (() => void) | null,
          src: '',
        };

        let _src = '';
        Object.defineProperty(img, 'src', {
          get: () => _src,
          set: (val: string) => {
            _src = val;
            activeFetches++;
            maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
            resolvers.push(() => {
              activeFetches--;
              if (img.onload) img.onload();
            });
          },
        });

        return img as unknown as HTMLImageElement;
      }) as unknown as typeof Image;

      const urls = Array.from(
        { length: 8 },
        (_, i) => `/images/test${i}.jpg`,
      );
      const promise = preloadImages(urls);

      // Resolve images one at a time and check concurrency
      while (resolvers.length > 0 || activeFetches > 0) {
        await new Promise((r) => setTimeout(r, 0));
        if (resolvers.length > 0) {
          resolvers.shift()!();
        }
      }

      await promise;
      expect(maxActiveFetches).toBeLessThanOrEqual(MAX_CONCURRENT_PRELOADS);
    });

    it('preloads all URLs even when exceeding concurrency limit', async () => {
      const loadedUrls: string[] = [];

      global.Image = vi.fn(() => {
        const img = {
          onload: null as (() => void) | null,
          onerror: null as (() => void) | null,
          src: '',
        };

        Object.defineProperty(img, 'src', {
          set: (val: string) => {
            loadedUrls.push(val);
            setTimeout(() => {
              if (img.onload) img.onload();
            }, 0);
          },
          get: () => '',
        });

        return img as unknown as HTMLImageElement;
      }) as unknown as typeof Image;

      const urls = Array.from(
        { length: 10 },
        (_, i) => `/images/test${i}.jpg`,
      );
      await preloadImages(urls);

      expect(loadedUrls).toHaveLength(10);
      urls.forEach((url) => {
        expect(loadedUrls).toContain(url);
      });
    });

    it('uses direct Promise.all for batches within concurrency limit', async () => {
      const mockImages: Array<{
        onload: (() => void) | null;
        onerror: (() => void) | null;
        src: string;
      }> = [];

      global.Image = vi.fn(() => {
        const img = { onload: null, onerror: null, src: '' };
        mockImages.push(img);
        return img as unknown as HTMLImageElement;
      }) as unknown as typeof Image;

      const urls = Array.from(
        { length: 3 },
        (_, i) => `/images/test${i}.jpg`,
      );
      const promise = preloadImages(urls);

      // All 3 should start immediately
      expect(mockImages).toHaveLength(3);

      mockImages.forEach((img) => {
        if (img.onload) img.onload();
      });
      await expect(promise).resolves.toBeUndefined();
    });

    it('rejects when any image fails in a large batch', async () => {
      let imageIndex = 0;
      global.Image = vi.fn(() => {
        const idx = imageIndex++;
        const img = {
          onload: null as (() => void) | null,
          onerror: null as (() => void) | null,
          src: '',
        };

        Object.defineProperty(img, 'src', {
          set: () => {
            setTimeout(() => {
              if (idx === 3) {
                if (img.onerror) img.onerror();
              } else {
                if (img.onload) img.onload();
              }
            }, 0);
          },
          get: () => '',
        });

        return img as unknown as HTMLImageElement;
      }) as unknown as typeof Image;

      const urls = Array.from(
        { length: 8 },
        (_, i) => `/images/test${i}.jpg`,
      );
      await expect(preloadImages(urls)).rejects.toThrow(
        'Failed to preload image',
      );
    });
  });
});
