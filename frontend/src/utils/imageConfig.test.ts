/**
 * Tests for imageConfig utility functions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  normalizeImageBaseUrl,
  getImageBaseUrl,
  clearImageConfigCache,
} from './imageConfig';

describe('imageConfig utilities', () => {
  beforeEach(() => {
    clearImageConfigCache();
    vi.clearAllMocks();
    // Reset import.meta.env
    vi.stubGlobal('import.meta.env', {
      ...import.meta.env,
      VITE_IMAGE_BASE_URL: undefined,
      DEV: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('normalizeImageBaseUrl', () => {
    it('normalizes absolute URL without trailing slash', () => {
      const result = normalizeImageBaseUrl('https://cdn.example.com');
      expect(result).toBe('https://cdn.example.com');
    });

    it('removes trailing slash from absolute URL', () => {
      const result = normalizeImageBaseUrl('https://cdn.example.com/');
      expect(result).toBe('https://cdn.example.com');
    });

    it('removes multiple trailing slashes from absolute URL', () => {
      const result = normalizeImageBaseUrl('https://cdn.example.com///');
      expect(result).toBe('https://cdn.example.com');
    });

    it('normalizes relative path without trailing slash', () => {
      const result = normalizeImageBaseUrl('/gallery-images');
      expect(result).toBe('/gallery-images');
    });

    it('removes trailing slash from relative path', () => {
      const result = normalizeImageBaseUrl('/gallery-images/');
      expect(result).toBe('/gallery-images');
    });

    it('removes multiple trailing slashes from relative path', () => {
      const result = normalizeImageBaseUrl('/gallery-images///');
      expect(result).toBe('/gallery-images');
    });

    it('returns default for empty string', () => {
      const result = normalizeImageBaseUrl('');
      expect(result).toBe('/images');
    });

    it('returns default for null', () => {
      const result = normalizeImageBaseUrl(null);
      expect(result).toBe('/images');
    });

    it('returns default for undefined', () => {
      const result = normalizeImageBaseUrl(undefined);
      expect(result).toBe('/images');
    });

    it('returns default for whitespace-only string', () => {
      const result = normalizeImageBaseUrl('   ');
      expect(result).toBe('/images');
    });

    it('returns default for invalid URL format (no protocol, no leading slash)', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = normalizeImageBaseUrl('invalid-url');
      expect(result).toBe('/images');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('handles HTTP URLs', () => {
      const result = normalizeImageBaseUrl('http://example.com/');
      expect(result).toBe('http://example.com');
    });

    it('handles URLs with path', () => {
      const result = normalizeImageBaseUrl('https://cdn.example.com/gallery-images/');
      expect(result).toBe('https://cdn.example.com/gallery-images');
    });

    it('handles relative paths with multiple segments', () => {
      const result = normalizeImageBaseUrl('/static/images/gallery/');
      expect(result).toBe('/static/images/gallery');
    });
  });

  describe('getImageBaseUrl', () => {
    it('returns default when no configuration is provided', () => {
      const result = getImageBaseUrl();
      expect(result).toBe('/images');
    });

    it('returns environment variable value when VITE_IMAGE_BASE_URL is set', async () => {
      vi.stubGlobal('import.meta.env', {
        ...import.meta.env,
        VITE_IMAGE_BASE_URL: 'https://cdn.example.com',
        DEV: true,
      });

      clearImageConfigCache();
      // Wait for async load to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = getImageBaseUrl();
      expect(result).toBe('https://cdn.example.com');
    });

    it('normalizes environment variable value', async () => {
      vi.stubGlobal('import.meta.env', {
        ...import.meta.env,
        VITE_IMAGE_BASE_URL: 'https://cdn.example.com/',
        DEV: true,
      });

      clearImageConfigCache();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = getImageBaseUrl();
      expect(result).toBe('https://cdn.example.com');
    });

    it('returns runtime config value when image-config.json exists', async () => {
      const mockConfig = { baseUrl: 'https://cdn.example.com/gallery-images' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      });

      clearImageConfigCache();
      // Wait for async load to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = getImageBaseUrl();
      expect(result).toBe('https://cdn.example.com/gallery-images');
      expect(global.fetch).toHaveBeenCalledWith('/image-config.json');
    });

    it('runtime config overrides environment variable', async () => {
      vi.stubGlobal('import.meta.env', {
        ...import.meta.env,
        VITE_IMAGE_BASE_URL: 'https://env.example.com',
        DEV: true,
      });

      const mockConfig = { baseUrl: 'https://cdn.example.com' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      });

      clearImageConfigCache();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = getImageBaseUrl();
      expect(result).toBe('https://cdn.example.com');
    });

    it('falls back to environment variable when runtime config returns 404', async () => {
      vi.stubGlobal('import.meta.env', {
        ...import.meta.env,
        VITE_IMAGE_BASE_URL: 'https://env.example.com',
        DEV: true,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      clearImageConfigCache();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = getImageBaseUrl();
      expect(result).toBe('https://env.example.com');
    });

    it('falls back to default when runtime config returns 404 and no env var', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      clearImageConfigCache();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = getImageBaseUrl();
      expect(result).toBe('/images');
    });

    it('handles JSON parse errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      clearImageConfigCache();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = getImageBaseUrl();
      expect(result).toBe('/images');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('handles invalid schema gracefully (missing baseUrl)', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'config' }),
      });

      clearImageConfigCache();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = getImageBaseUrl();
      expect(result).toBe('/images');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('handles network errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      clearImageConfigCache();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = getImageBaseUrl();
      expect(result).toBe('/images');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('caches configuration after first load', async () => {
      const mockConfig = { baseUrl: 'https://cdn.example.com' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      });

      clearImageConfigCache();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // First call
      const result1 = getImageBaseUrl();
      expect(result1).toBe('https://cdn.example.com');

      // Second call should use cache (fetch should only be called once)
      const result2 = getImageBaseUrl();
      expect(result2).toBe('https://cdn.example.com');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('returns default immediately before configuration loads', () => {
      // Don't wait for async load
      const result = getImageBaseUrl();
      expect(result).toBe('/images');
    });
  });

  describe('clearImageConfigCache', () => {
    it('clears cached configuration', async () => {
      const mockConfig = { baseUrl: 'https://cdn.example.com' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      });

      clearImageConfigCache();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result1 = getImageBaseUrl();
      expect(result1).toBe('https://cdn.example.com');

      clearImageConfigCache();

      // After clearing, should return default until reload
      const result2 = getImageBaseUrl();
      expect(result2).toBe('/images');
    });

    it('allows reloading configuration after clearing', async () => {
      const mockConfig1 = { baseUrl: 'https://cdn1.example.com' };
      const mockConfig2 = { baseUrl: 'https://cdn2.example.com' };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConfig1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConfig2,
        });

      clearImageConfigCache();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result1 = getImageBaseUrl();
      expect(result1).toBe('https://cdn1.example.com');

      clearImageConfigCache();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result2 = getImageBaseUrl();
      expect(result2).toBe('https://cdn2.example.com');
    });
  });
});
