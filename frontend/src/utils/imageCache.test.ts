/**
 * Tests for image cache utility
 *
 * @module frontend/src/utils/imageCache
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ImageCache,
  getImageCache,
  configureImageCache,
  resetImageCache,
  type ImageCacheConfig,
} from './imageCache';

describe('ImageCache', () => {
  beforeEach(() => {
    resetImageCache();
  });

  describe('constructor', () => {
    it('creates cache with default configuration', () => {
      const cache = new ImageCache();
      expect(cache.size()).toBe(0);
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
    });

    it('creates cache with custom configuration', () => {
      const config: Partial<ImageCacheConfig> = { maxSize: 10 };
      const cache = new ImageCache(config);
      expect(cache.size()).toBe(0);
    });
  });

  describe('get', () => {
    it('returns null for empty cache', () => {
      const cache = new ImageCache();
      expect(cache.get('/images/test.jpg')).toBeNull();
    });

    it('returns null for invalid URL', () => {
      const cache = new ImageCache();
      expect(cache.get('')).toBeNull();
    });

    it('returns cached image', () => {
      const cache = new ImageCache();
      const img = new Image();
      img.src = '/images/test.jpg';
      cache.set('/images/test.jpg', img);

      const result = cache.get('/images/test.jpg');
      expect(result).toBe(img);
    });

    it('updates LRU order on get', () => {
      const cache = new ImageCache({ maxSize: 2 });
      const img1 = new Image();
      const img2 = new Image();
      cache.set('/images/1.jpg', img1);
      cache.set('/images/2.jpg', img2);

      // Access first image (should move it to end)
      cache.get('/images/1.jpg');

      // Add third image (should evict img2, not img1)
      const img3 = new Image();
      cache.set('/images/3.jpg', img3);

      expect(cache.has('/images/1.jpg')).toBe(true);
      expect(cache.has('/images/2.jpg')).toBe(false);
      expect(cache.has('/images/3.jpg')).toBe(true);
    });

    it('increments access count on get', () => {
      const cache = new ImageCache();
      const img = new Image();
      cache.set('/images/test.jpg', img);

      cache.get('/images/test.jpg');
      cache.get('/images/test.jpg');
      cache.get('/images/test.jpg');

      // Access count is tracked internally, verify via stats
      const stats = cache.getStats();
      expect(stats.hitCount).toBe(3);
    });
  });

  describe('set', () => {
    it('stores image in cache', () => {
      const cache = new ImageCache();
      const img = new Image();
      img.src = '/images/test.jpg';

      cache.set('/images/test.jpg', img);

      expect(cache.has('/images/test.jpg')).toBe(true);
      expect(cache.get('/images/test.jpg')).toBe(img);
    });

    it('does not store invalid entries', () => {
      const cache = new ImageCache();
      cache.set('', new Image());
      cache.set('/images/test.jpg', null as unknown as HTMLImageElement);

      expect(cache.size()).toBe(0);
    });

    it('updates existing entry', () => {
      const cache = new ImageCache();
      const img1 = new Image();
      const img2 = new Image();
      cache.set('/images/test.jpg', img1);
      cache.set('/images/test.jpg', img2);

      expect(cache.get('/images/test.jpg')).toBe(img2);
      expect(cache.size()).toBe(1);
    });

    it('evicts LRU entry when cache is full', () => {
      const cache = new ImageCache({ maxSize: 2 });
      const img1 = new Image();
      const img2 = new Image();
      const img3 = new Image();

      cache.set('/images/1.jpg', img1);
      cache.set('/images/2.jpg', img2);
      cache.set('/images/3.jpg', img3);

      expect(cache.has('/images/1.jpg')).toBe(false);
      expect(cache.has('/images/2.jpg')).toBe(true);
      expect(cache.has('/images/3.jpg')).toBe(true);
      expect(cache.size()).toBe(2);
    });

    it('updates LRU order on set', () => {
      const cache = new ImageCache({ maxSize: 2 });
      const img1 = new Image();
      const img2 = new Image();
      const img3 = new Image();

      cache.set('/images/1.jpg', img1);
      cache.set('/images/2.jpg', img2);
      // Access first image
      cache.get('/images/1.jpg');
      // Add third image (should evict img2, not img1)
      cache.set('/images/3.jpg', img3);

      expect(cache.has('/images/1.jpg')).toBe(true);
      expect(cache.has('/images/2.jpg')).toBe(false);
      expect(cache.has('/images/3.jpg')).toBe(true);
    });
  });

  describe('has', () => {
    it('returns false for empty cache', () => {
      const cache = new ImageCache();
      expect(cache.has('/images/test.jpg')).toBe(false);
    });

    it('returns false for invalid URL', () => {
      const cache = new ImageCache();
      expect(cache.has('')).toBe(false);
    });

    it('returns true for cached image', () => {
      const cache = new ImageCache();
      const img = new Image();
      cache.set('/images/test.jpg', img);

      expect(cache.has('/images/test.jpg')).toBe(true);
    });

    it('returns false for non-cached image', () => {
      const cache = new ImageCache();
      const img = new Image();
      cache.set('/images/test.jpg', img);

      expect(cache.has('/images/other.jpg')).toBe(false);
    });
  });

  describe('delete', () => {
    it('removes image from cache', () => {
      const cache = new ImageCache();
      const img = new Image();
      cache.set('/images/test.jpg', img);

      const result = cache.delete('/images/test.jpg');

      expect(result).toBe(true);
      expect(cache.has('/images/test.jpg')).toBe(false);
      expect(cache.size()).toBe(0);
    });

    it('returns false for non-existent image', () => {
      const cache = new ImageCache();
      expect(cache.delete('/images/test.jpg')).toBe(false);
    });

    it('returns false for invalid URL', () => {
      const cache = new ImageCache();
      expect(cache.delete('')).toBe(false);
    });

    it('removes from LRU order', () => {
      const cache = new ImageCache();
      const img1 = new Image();
      const img2 = new Image();
      cache.set('/images/1.jpg', img1);
      cache.set('/images/2.jpg', img2);

      cache.delete('/images/1.jpg');

      expect(cache.has('/images/1.jpg')).toBe(false);
      expect(cache.has('/images/2.jpg')).toBe(true);
      expect(cache.size()).toBe(1);
    });
  });

  describe('clear', () => {
    it('clears empty cache', () => {
      const cache = new ImageCache();
      cache.clear();
      expect(cache.size()).toBe(0);
    });

    it('clears all entries', () => {
      const cache = new ImageCache();
      const img1 = new Image();
      const img2 = new Image();
      cache.set('/images/1.jpg', img1);
      cache.set('/images/2.jpg', img2);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.has('/images/1.jpg')).toBe(false);
      expect(cache.has('/images/2.jpg')).toBe(false);
    });

    it('resets statistics when enabled', () => {
      const cache = new ImageCache({ enableStats: true });
      const img = new Image();
      cache.set('/images/test.jpg', img);
      cache.get('/images/test.jpg');

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
      expect(stats.evictionCount).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('size', () => {
    it('returns 0 for empty cache', () => {
      const cache = new ImageCache();
      expect(cache.size()).toBe(0);
    });

    it('returns correct size', () => {
      const cache = new ImageCache();
      cache.set('/images/1.jpg', new Image());
      cache.set('/images/2.jpg', new Image());
      cache.set('/images/3.jpg', new Image());

      expect(cache.size()).toBe(3);
    });

    it('updates size after deletion', () => {
      const cache = new ImageCache();
      cache.set('/images/1.jpg', new Image());
      cache.set('/images/2.jpg', new Image());

      cache.delete('/images/1.jpg');

      expect(cache.size()).toBe(1);
    });
  });

  describe('getStats', () => {
    it('returns initial statistics', () => {
      const cache = new ImageCache();
      const stats = cache.getStats();

      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.evictionCount).toBe(0);
    });

    it('tracks cache hits', () => {
      const cache = new ImageCache();
      const img = new Image();
      cache.set('/images/test.jpg', img);
      cache.get('/images/test.jpg');
      cache.get('/images/test.jpg');

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(0);
      expect(stats.hitRate).toBe(1);
    });

    it('tracks cache misses', () => {
      const cache = new ImageCache();
      cache.get('/images/test.jpg');
      cache.get('/images/other.jpg');

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(2);
      expect(stats.hitRate).toBe(0);
    });

    it('calculates hit rate correctly', () => {
      const cache = new ImageCache();
      const img = new Image();
      cache.set('/images/test.jpg', img);

      cache.get('/images/test.jpg'); // hit
      cache.get('/images/test.jpg'); // hit
      cache.get('/images/miss.jpg'); // miss
      cache.get('/images/test.jpg'); // hit

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(3);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(0.75);
    });

    it('tracks evictions', () => {
      const cache = new ImageCache({ maxSize: 2 });
      cache.set('/images/1.jpg', new Image());
      cache.set('/images/2.jpg', new Image());
      cache.set('/images/3.jpg', new Image()); // evicts 1

      const stats = cache.getStats();
      expect(stats.evictionCount).toBe(1);
    });

    it('tracks cache size', () => {
      const cache = new ImageCache();
      cache.set('/images/1.jpg', new Image());
      cache.set('/images/2.jpg', new Image());

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('evicts least recently used entry', () => {
      const cache = new ImageCache({ maxSize: 3 });
      cache.set('/images/1.jpg', new Image());
      cache.set('/images/2.jpg', new Image());
      cache.set('/images/3.jpg', new Image());

      // Access 1 and 2, making 3 the least recently used
      cache.get('/images/1.jpg');
      cache.get('/images/2.jpg');

      // Add 4th image, should evict 3
      cache.set('/images/4.jpg', new Image());

      expect(cache.has('/images/1.jpg')).toBe(true);
      expect(cache.has('/images/2.jpg')).toBe(true);
      expect(cache.has('/images/3.jpg')).toBe(false);
      expect(cache.has('/images/4.jpg')).toBe(true);
    });

    it('evicts multiple entries if needed', () => {
      const cache = new ImageCache({ maxSize: 2 });
      cache.set('/images/1.jpg', new Image());
      cache.set('/images/2.jpg', new Image());

      // Access 1, making 2 the least recently used
      cache.get('/images/1.jpg');

      // Add 3rd image, should evict 2
      cache.set('/images/3.jpg', new Image());

      expect(cache.has('/images/1.jpg')).toBe(true);
      expect(cache.has('/images/2.jpg')).toBe(false);
      expect(cache.has('/images/3.jpg')).toBe(true);
    });

    it('handles eviction when cache is exactly at limit', () => {
      const cache = new ImageCache({ maxSize: 2 });
      cache.set('/images/1.jpg', new Image());
      cache.set('/images/2.jpg', new Image());

      // Cache is at limit, adding 3rd should evict 1
      cache.set('/images/3.jpg', new Image());

      expect(cache.has('/images/1.jpg')).toBe(false);
      expect(cache.has('/images/2.jpg')).toBe(true);
      expect(cache.has('/images/3.jpg')).toBe(true);
    });
  });

  describe('LRU ordering correctness', () => {
    it('maintains correct LRU order with many entries', () => {
      const cache = new ImageCache({ maxSize: 10 });

      // Fill cache with 10 entries
      for (let i = 0; i < 10; i++) {
        cache.set(`/images/${i}.jpg`, new Image());
      }

      // Access all entries in order (0 through 9)
      for (let i = 0; i < 10; i++) {
        cache.get(`/images/${i}.jpg`);
      }

      // Now access all except entry 0, making it LRU
      for (let i = 1; i < 10; i++) {
        cache.get(`/images/${i}.jpg`);
      }

      // Add new entry, should evict entry 0
      cache.set("/images/new.jpg", new Image());

      expect(cache.has("/images/0.jpg")).toBe(false);
      expect(cache.has("/images/new.jpg")).toBe(true);
      for (let i = 1; i < 10; i++) {
        expect(cache.has(`/images/${i}.jpg`)).toBe(true);
      }
    });

    it('handles repeated access to same entry without corrupting LRU order', () => {
      const cache = new ImageCache({ maxSize: 3 });
      cache.set("/images/1.jpg", new Image());
      cache.set("/images/2.jpg", new Image());
      cache.set("/images/3.jpg", new Image());

      // Access entry 1 many times
      for (let i = 0; i < 20; i++) {
        cache.get("/images/1.jpg");
      }

      // Entry 2 should be the LRU (oldest not accessed since insertion)
      cache.set("/images/4.jpg", new Image());

      expect(cache.has("/images/1.jpg")).toBe(true);
      expect(cache.has("/images/2.jpg")).toBe(false);
      expect(cache.has("/images/3.jpg")).toBe(true);
      expect(cache.has("/images/4.jpg")).toBe(true);
    });

    it('handles delete of middle entry followed by correct eviction', () => {
      const cache = new ImageCache({ maxSize: 3 });
      cache.set("/images/1.jpg", new Image());
      cache.set("/images/2.jpg", new Image());
      cache.set("/images/3.jpg", new Image());

      // Delete middle entry
      cache.delete("/images/2.jpg");

      // Add two new entries (one fills the gap, one triggers eviction of LRU = entry 1)
      cache.set("/images/4.jpg", new Image());
      cache.set("/images/5.jpg", new Image());

      expect(cache.has("/images/1.jpg")).toBe(false); // evicted as LRU
      expect(cache.has("/images/2.jpg")).toBe(false); // explicitly deleted
      expect(cache.has("/images/3.jpg")).toBe(true);
      expect(cache.has("/images/4.jpg")).toBe(true);
      expect(cache.has("/images/5.jpg")).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty cache gracefully', () => {
      const cache = new ImageCache();
      expect(cache.get('/images/test.jpg')).toBeNull();
      expect(cache.has('/images/test.jpg')).toBe(false);
      expect(cache.delete('/images/test.jpg')).toBe(false);
    });

    it('handles single entry cache', () => {
      const cache = new ImageCache({ maxSize: 1 });
      const img = new Image();
      cache.set('/images/test.jpg', img);

      expect(cache.get('/images/test.jpg')).toBe(img);
      expect(cache.size()).toBe(1);
    });

    it('handles cache at max size', () => {
      const cache = new ImageCache({ maxSize: 2 });
      cache.set('/images/1.jpg', new Image());
      cache.set('/images/2.jpg', new Image());

      expect(cache.size()).toBe(2);
      expect(cache.has('/images/1.jpg')).toBe(true);
      expect(cache.has('/images/2.jpg')).toBe(true);
    });
  });
});

describe('getImageCache', () => {
  beforeEach(() => {
    resetImageCache();
  });

  it('returns singleton instance', () => {
    const cache1 = getImageCache();
    const cache2 = getImageCache();

    expect(cache1).toBe(cache2);
  });

  it('returns same instance across calls', () => {
    const cache1 = getImageCache();
    cache1.set('/images/test.jpg', new Image());

    const cache2 = getImageCache();
    expect(cache2.has('/images/test.jpg')).toBe(true);
  });
});

describe('configureImageCache', () => {
  beforeEach(() => {
    resetImageCache();
  });

  it('creates new instance with configuration', () => {
    const cache = configureImageCache({ maxSize: 10 });
    expect(cache.size()).toBe(0);
  });

  it('replaces singleton instance', () => {
    const cache1 = getImageCache();
    cache1.set('/images/test.jpg', new Image());

    const cache2 = configureImageCache({ maxSize: 5 });
    expect(cache2.has('/images/test.jpg')).toBe(false);
  });
});

describe('resetImageCache', () => {
  it('resets singleton instance', () => {
    const cache1 = getImageCache();
    cache1.set('/images/test.jpg', new Image());

    resetImageCache();

    const cache2 = getImageCache();
    expect(cache2.has('/images/test.jpg')).toBe(false);
  });
});
