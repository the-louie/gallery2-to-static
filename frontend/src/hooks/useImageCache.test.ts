/**
 * Tests for useImageCache hook
 *
 * @module frontend/src/hooks/useImageCache
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@/test-utils';
import { useImageCache } from './useImageCache';
import { resetImageCache, getImageCache } from '@/utils/imageCache';

describe('useImageCache', () => {
  beforeEach(() => {
    resetImageCache();
  });

  it('returns cache instance', () => {
    const { result } = renderHook(() => useImageCache());

    expect(result.current.cache).toBeDefined();
    expect(result.current.cache).toBe(getImageCache());
  });

  it('returns cache statistics', () => {
    const { result } = renderHook(() => useImageCache());

    expect(result.current.stats).toBeDefined();
    expect(result.current.stats.hitCount).toBe(0);
    expect(result.current.stats.missCount).toBe(0);
    expect(result.current.stats.size).toBe(0);
  });

  it('provides cache operations', () => {
    const { result } = renderHook(() => useImageCache());

    expect(typeof result.current.get).toBe('function');
    expect(typeof result.current.set).toBe('function');
    expect(typeof result.current.has).toBe('function');
    expect(typeof result.current.delete).toBe('function');
    expect(typeof result.current.clear).toBe('function');
    expect(typeof result.current.size).toBe('function');
  });

  it('get operation works', () => {
    const { result } = renderHook(() => useImageCache());
    const img = new Image();
    result.current.set('/images/test.jpg', img);

    const cached = result.current.get('/images/test.jpg');
    expect(cached).toBe(img);
  });

  it('set operation works', () => {
    const { result } = renderHook(() => useImageCache());
    const img = new Image();

    result.current.set('/images/test.jpg', img);

    expect(result.current.has('/images/test.jpg')).toBe(true);
  });

  it('has operation works', () => {
    const { result } = renderHook(() => useImageCache());
    const img = new Image();

    expect(result.current.has('/images/test.jpg')).toBe(false);

    result.current.set('/images/test.jpg', img);

    expect(result.current.has('/images/test.jpg')).toBe(true);
  });

  it('delete operation works', () => {
    const { result } = renderHook(() => useImageCache());
    const img = new Image();
    result.current.set('/images/test.jpg', img);

    const deleted = result.current.delete('/images/test.jpg');

    expect(deleted).toBe(true);
    expect(result.current.has('/images/test.jpg')).toBe(false);
  });

  it('clear operation works', () => {
    const { result } = renderHook(() => useImageCache());
    result.current.set('/images/1.jpg', new Image());
    result.current.set('/images/2.jpg', new Image());

    result.current.clear();

    expect(result.current.size()).toBe(0);
    expect(result.current.has('/images/1.jpg')).toBe(false);
    expect(result.current.has('/images/2.jpg')).toBe(false);
  });

  it('size operation works', () => {
    const { result } = renderHook(() => useImageCache());

    expect(result.current.size()).toBe(0);

    result.current.set('/images/1.jpg', new Image());
    result.current.set('/images/2.jpg', new Image());

    expect(result.current.size()).toBe(2);
  });

  it('returns same cache instance across renders', () => {
    const { result, rerender } = renderHook(() => useImageCache());
    const cache1 = result.current.cache;

    rerender();

    expect(result.current.cache).toBe(cache1);
  });
});
