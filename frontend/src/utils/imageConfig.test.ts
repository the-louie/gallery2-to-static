/**
 * Tests for imageConfig utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  getImageBaseUrl,
  getThumbnailBaseUrl,
  clearImageConfigCache,
  IMAGE_BASE_URL,
  THUMBNAIL_BASE_URL,
  DEFAULT_BASE_URL,
} from './imageConfig';

describe('imageConfig utilities', () => {
  describe('getImageBaseUrl', () => {
    it('returns fixed image base URL', () => {
      expect(getImageBaseUrl()).toBe('/g2data/albums');
    });

    it('returns IMAGE_BASE_URL constant', () => {
      expect(getImageBaseUrl()).toBe(IMAGE_BASE_URL);
    });
  });

  describe('getThumbnailBaseUrl', () => {
    it('returns fixed thumbnail base URL', () => {
      expect(getThumbnailBaseUrl()).toBe('/g2data/thumbnails');
    });

    it('returns THUMBNAIL_BASE_URL constant', () => {
      expect(getThumbnailBaseUrl()).toBe(THUMBNAIL_BASE_URL);
    });
  });

  describe('constants', () => {
    it('DEFAULT_BASE_URL equals IMAGE_BASE_URL', () => {
      expect(DEFAULT_BASE_URL).toBe(IMAGE_BASE_URL);
    });
  });

  describe('clearImageConfigCache', () => {
    it('does not throw', () => {
      expect(() => clearImageConfigCache()).not.toThrow();
    });

    it('does not affect getImageBaseUrl result', () => {
      const before = getImageBaseUrl();
      clearImageConfigCache();
      const after = getImageBaseUrl();
      expect(after).toBe(before);
    });
  });
});
