/**
 * Tests for albumThemesConfig utility functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getThemeForAlbum,
  getAlbumIdFromPath,
  loadAlbumThemesConfig,
  clearAlbumThemesConfigCache,
  isValidAlbumThemesConfig,
} from './albumThemesConfig';

const originalFetch = globalThis.fetch;

describe('albumThemesConfig utilities', () => {
  beforeEach(() => {
    clearAlbumThemesConfigCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('getThemeForAlbum', () => {
    it('returns defaultTheme when albumId is null', () => {
      const config = { defaultTheme: 'dark' as const, albumThemes: {} };
      expect(getThemeForAlbum(null, config)).toBe('dark');
    });

    it('returns album-specific theme when configured', () => {
      const config = {
        defaultTheme: 'original',
        albumThemes: { '7': 'dark', '12': 'light' },
      };
      expect(getThemeForAlbum(7, config)).toBe('dark');
      expect(getThemeForAlbum(12, config)).toBe('light');
    });

    it('falls back to defaultTheme when album has invalid theme', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const config = {
        defaultTheme: 'light',
        albumThemes: { '7': 'invalid' },
      };
      expect(getThemeForAlbum(7, config)).toBe('light');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('returns null when album has no override', () => {
      const config = {
        defaultTheme: 'dark',
        albumThemes: { '12': 'light' },
      };
      expect(getThemeForAlbum(7, config)).toBe(null);
    });

    it('returns null when config is empty', () => {
      expect(getThemeForAlbum(7, {})).toBe(null);
    });

    it('returns null when albumThemes is empty', () => {
      const config = { defaultTheme: 'original', albumThemes: {} };
      expect(getThemeForAlbum(7, config)).toBe(null);
    });

    it('returns null when album has no override and defaultTheme is invalid', () => {
      const config = {
        defaultTheme: 'invalid',
        albumThemes: {},
      };
      expect(getThemeForAlbum(7, config)).toBe(null);
    });
  });

  describe('getAlbumIdFromPath', () => {
    it('extracts album ID from /album/7', () => {
      expect(getAlbumIdFromPath('/album/7')).toBe(7);
    });

    it('extracts album ID from /album/7/image/10', () => {
      expect(getAlbumIdFromPath('/album/7/image/10')).toBe(7);
    });

    it('extracts album ID from /album/123/image/456', () => {
      expect(getAlbumIdFromPath('/album/123/image/456')).toBe(123);
    });

    it('returns null for /', () => {
      expect(getAlbumIdFromPath('/')).toBe(null);
    });

    it('returns null for /search', () => {
      expect(getAlbumIdFromPath('/search')).toBe(null);
    });

    it('returns null for /not-found', () => {
      expect(getAlbumIdFromPath('/not-found')).toBe(null);
    });

    it('returns null for empty string', () => {
      expect(getAlbumIdFromPath('')).toBe(null);
    });

    it('returns null for path without album', () => {
      expect(getAlbumIdFromPath('/other/path')).toBe(null);
    });

    it('returns null for /album/ without ID', () => {
      expect(getAlbumIdFromPath('/album/')).toBe(null);
    });
  });

  describe('loadAlbumThemesConfig', () => {
    it('returns default config when file returns 404', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

      const config = await loadAlbumThemesConfig();

      expect(config).toEqual({
        defaultTheme: 'original',
        albumThemes: {},
      });
      expect(globalThis.fetch).toHaveBeenCalledWith('/album-themes.json');
    });

    it('caches default config on 404 to prevent repeated fetches', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

      const config1 = await loadAlbumThemesConfig();
      const config2 = await loadAlbumThemesConfig();

      expect(config1).toEqual(config2);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('returns parsed config when file is valid', async () => {
      const mockConfig = {
        defaultTheme: 'dark',
        albumThemes: { '7': 'light', '12': 'original' },
      };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      });

      const config = await loadAlbumThemesConfig();

      expect(config).toEqual(mockConfig);
    });

    it('returns default config when JSON is malformed', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const config = await loadAlbumThemesConfig();

      expect(config).toEqual({
        defaultTheme: 'original',
        albumThemes: {},
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('returns default config when schema is invalid', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'structure' }),
      });

      const config = await loadAlbumThemesConfig();

      expect(config.defaultTheme).toBe('original');
      expect(config.albumThemes).toEqual({});
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('handles network errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const config = await loadAlbumThemesConfig();

      expect(config).toEqual({
        defaultTheme: 'original',
        albumThemes: {},
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('caches config after first load', async () => {
      const mockConfig = {
        defaultTheme: 'dark',
        albumThemes: { '7': 'light' },
      };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      });

      const config1 = await loadAlbumThemesConfig();
      const config2 = await loadAlbumThemesConfig();

      expect(config1).toEqual(config2);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearAlbumThemesConfigCache', () => {
    it('allows reloading config after clearing', async () => {
      const mockConfig1 = {
        defaultTheme: 'dark',
        albumThemes: { '7': 'light' },
      };
      const mockConfig2 = {
        defaultTheme: 'light',
        albumThemes: { '7': 'dark' },
      };

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConfig1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConfig2,
        });

      const config1 = await loadAlbumThemesConfig();
      expect(config1.defaultTheme).toBe('dark');

      clearAlbumThemesConfigCache();

      const config2 = await loadAlbumThemesConfig();
      expect(config2.defaultTheme).toBe('light');
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('isValidAlbumThemesConfig', () => {
    it('returns true for valid config', () => {
      expect(
        isValidAlbumThemesConfig({
          defaultTheme: 'dark',
          albumThemes: { '7': 'light' },
        }),
      ).toBe(true);
    });

    it('returns true for minimal valid config', () => {
      expect(isValidAlbumThemesConfig({})).toBe(true);
    });

    it('returns false for null', () => {
      expect(isValidAlbumThemesConfig(null)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isValidAlbumThemesConfig('string')).toBe(false);
      expect(isValidAlbumThemesConfig(123)).toBe(false);
    });

    it('returns false when defaultTheme is not a string', () => {
      expect(
        isValidAlbumThemesConfig({ defaultTheme: 123 }),
      ).toBe(false);
    });

    it('returns false when albumThemes is not an object', () => {
      expect(
        isValidAlbumThemesConfig({ albumThemes: 'invalid' }),
      ).toBe(false);
    });

    it('returns false when albumThemes is an array', () => {
      expect(isValidAlbumThemesConfig({ albumThemes: [] })).toBe(false);
      expect(isValidAlbumThemesConfig({ albumThemes: ['light', 'dark'] })).toBe(
        false,
      );
    });
  });
});
