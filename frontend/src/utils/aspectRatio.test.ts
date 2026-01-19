/**
 * Tests for aspectRatio utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAspectRatio,
  getAspectRatioWithFallback,
} from './aspectRatio';

describe('aspectRatio utilities', () => {
  describe('calculateAspectRatio', () => {
    it('calculates aspect ratio correctly for landscape image', () => {
      const ratio = calculateAspectRatio(1920, 1080);
      expect(ratio).toBeCloseTo(1.777, 2);
    });

    it('calculates aspect ratio correctly for portrait image', () => {
      const ratio = calculateAspectRatio(1080, 1920);
      expect(ratio).toBeCloseTo(0.5625, 4);
    });

    it('calculates aspect ratio correctly for square image', () => {
      const ratio = calculateAspectRatio(1000, 1000);
      expect(ratio).toBe(1);
    });

    it('returns null when width is null', () => {
      const ratio = calculateAspectRatio(null, 1080);
      expect(ratio).toBeNull();
    });

    it('returns null when height is null', () => {
      const ratio = calculateAspectRatio(1920, null);
      expect(ratio).toBeNull();
    });

    it('returns null when both dimensions are null', () => {
      const ratio = calculateAspectRatio(null, null);
      expect(ratio).toBeNull();
    });

    it('returns null when width is zero', () => {
      const ratio = calculateAspectRatio(0, 1080);
      expect(ratio).toBeNull();
    });

    it('returns null when height is zero', () => {
      const ratio = calculateAspectRatio(1920, 0);
      expect(ratio).toBeNull();
    });

    it('returns null when both dimensions are zero', () => {
      const ratio = calculateAspectRatio(0, 0);
      expect(ratio).toBeNull();
    });

    it('returns null when width is negative', () => {
      const ratio = calculateAspectRatio(-100, 1080);
      expect(ratio).toBeNull();
    });

    it('returns null when height is negative', () => {
      const ratio = calculateAspectRatio(1920, -100);
      expect(ratio).toBeNull();
    });

    it('handles small dimensions correctly', () => {
      const ratio = calculateAspectRatio(100, 50);
      expect(ratio).toBe(2);
    });

    it('handles large dimensions correctly', () => {
      const ratio = calculateAspectRatio(7680, 4320);
      expect(ratio).toBeCloseTo(1.777, 2);
    });
  });

  describe('getAspectRatioWithFallback', () => {
    it('returns calculated ratio when dimensions are valid', () => {
      const ratio = getAspectRatioWithFallback(1920, 1080);
      expect(ratio).toBeCloseTo(1.777, 2);
    });

    it('returns default ratio when width is null', () => {
      const ratio = getAspectRatioWithFallback(null, 1080);
      expect(ratio).toBeCloseTo(1.777, 2);
    });

    it('returns default ratio when height is null', () => {
      const ratio = getAspectRatioWithFallback(1920, null);
      expect(ratio).toBeCloseTo(1.777, 2);
    });

    it('returns default ratio when both dimensions are null', () => {
      const ratio = getAspectRatioWithFallback(null, null);
      expect(ratio).toBeCloseTo(1.777, 2);
    });

    it('returns default ratio when dimensions are zero', () => {
      const ratio = getAspectRatioWithFallback(0, 0);
      expect(ratio).toBeCloseTo(1.777, 2);
    });
  });
});
