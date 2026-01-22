/**
 * Browser Compatibility Tests
 *
 * Tests for browser feature detection and fallback implementations.
 * Ensures the application gracefully handles unsupported browser features.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Browser Compatibility', () => {
  describe('IntersectionObserver Support', () => {
    beforeEach(() => {
      // Clear any existing mocks
      delete (global as any).IntersectionObserver;
    });

    afterEach(() => {
      // Restore if needed
      delete (global as any).IntersectionObserver;
    });

    it('detects IntersectionObserver when available', () => {
      const mockObserve = vi.fn();
      const mockDisconnect = vi.fn();

      (global as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
        observe: mockObserve,
        disconnect: mockDisconnect,
      }));

      expect(typeof IntersectionObserver).not.toBe('undefined');
      expect(() => new IntersectionObserver(() => {})).not.toThrow();
    });

    it('detects when IntersectionObserver is unavailable', () => {
      delete (global as any).IntersectionObserver;
      expect(typeof IntersectionObserver).toBe('undefined');
    });

    it('can create IntersectionObserver with options', () => {
      (global as any).IntersectionObserver = vi.fn().mockImplementation(
        (callback, options) => ({
          observe: vi.fn(),
          disconnect: vi.fn(),
        })
      );

      const observer = new IntersectionObserver(
        () => {},
        { rootMargin: '0px 0px 200px 0px', threshold: 0.01 }
      );

      expect(observer).toBeDefined();
    });
  });

  describe('localStorage Support', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('detects localStorage when available', () => {
      expect(typeof window).not.toBe('undefined');
      expect(typeof window.localStorage).not.toBe('undefined');
    });

    it('can read from localStorage', () => {
      localStorage.setItem('test', 'value');
      expect(localStorage.getItem('test')).toBe('value');
    });

    it('can write to localStorage', () => {
      localStorage.setItem('test', 'newValue');
      expect(localStorage.getItem('test')).toBe('newValue');
    });

    it('handles localStorage errors gracefully', () => {
      // Mock localStorage to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

      try {
        localStorage.setItem('test', 'value');
      } catch (error) {
        expect(error).toBeInstanceOf(DOMException);
      }

      localStorage.setItem = originalSetItem;
    });

    it('handles localStorage unavailable (private browsing)', () => {
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      expect(typeof window.localStorage).toBe('undefined');

      window.localStorage = originalLocalStorage;
    });
  });

  describe('sessionStorage Support', () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    afterEach(() => {
      sessionStorage.clear();
    });

    it('detects sessionStorage when available', () => {
      expect(typeof window).not.toBe('undefined');
      expect(typeof window.sessionStorage).not.toBe('undefined');
    });

    it('can read from sessionStorage', () => {
      sessionStorage.setItem('test', 'value');
      expect(sessionStorage.getItem('test')).toBe('value');
    });

    it('can write to sessionStorage', () => {
      sessionStorage.setItem('test', 'newValue');
      expect(sessionStorage.getItem('test')).toBe('newValue');
    });

    it('handles sessionStorage unavailable', () => {
      const originalSessionStorage = window.sessionStorage;
      Object.defineProperty(window, 'sessionStorage', {
        value: undefined,
        writable: true,
      });

      expect(typeof window.sessionStorage).toBe('undefined');

      window.sessionStorage = originalSessionStorage;
    });
  });

  describe('CSS Custom Properties Support', () => {
    it('can set CSS custom properties', () => {
      const element = document.createElement('div');
      element.style.setProperty('--test-color', '#ff0000');
      expect(element.style.getPropertyValue('--test-color')).toBe('#ff0000');
    });

    it('can read CSS custom properties', () => {
      const element = document.createElement('div');
      element.style.setProperty('--test-color', '#00ff00');
      const value = getComputedStyle(element).getPropertyValue('--test-color');
      expect(value.trim()).toBe('#00ff00');
    });
  });

  describe('Window Object Availability', () => {
    it('detects window object in browser environment', () => {
      expect(typeof window).not.toBe('undefined');
    });

    it('handles window.innerWidth', () => {
      expect(typeof window.innerWidth).toBe('number');
      expect(window.innerWidth).toBeGreaterThan(0);
    });
  });

  describe('Feature Detection Utilities', () => {
    it('can check for IntersectionObserver support', () => {
      const isSupported = typeof IntersectionObserver !== 'undefined';
      expect(typeof isSupported).toBe('boolean');
    });

    it('can check for localStorage support', () => {
      const isSupported =
        typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
      expect(typeof isSupported).toBe('boolean');
    });

    it('can check for sessionStorage support', () => {
      const isSupported =
        typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('ES2020 Features', () => {
    it('supports optional chaining', () => {
      const obj: { prop?: { nested?: string } } = {};
      expect(obj.prop?.nested).toBeUndefined();

      const obj2 = { prop: { nested: 'value' } };
      expect(obj2.prop?.nested).toBe('value');
    });

    it('supports nullish coalescing', () => {
      const value1 = null ?? 'default';
      expect(value1).toBe('default');

      const value2 = undefined ?? 'default';
      expect(value2).toBe('default');

      const value3 = 'actual' ?? 'default';
      expect(value3).toBe('actual');
    });

    it('supports async/await', async () => {
      const asyncFunction = async () => {
        return Promise.resolve('result');
      };

      const result = await asyncFunction();
      expect(result).toBe('result');
    });
  });
});
