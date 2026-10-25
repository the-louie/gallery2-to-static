import '@testing-library/jest-dom';
import { afterEach, vi, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';

// Extend Vitest matchers with vitest-axe
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock useProgressiveImage globally — components get synchronous URLs instead of async blob fetching.
// Uses the same fallback order as the real hook: thumbnailUrlPath > pathComponent.
vi.mock('@/hooks/useProgressiveImage', () => ({
  useProgressiveImage: vi.fn((image: any, useThumbnail: boolean = true, options: { loadFull?: boolean } = {}) => {
    if (!image) {
      return { thumbnailUrl: '', fullImageUrl: '', state: 'thumbnail' as const, hasError: false, error: null };
    }
    const thumbPath = image.thumbnailUrlPath || image.pathComponent || '';
    const fullPath = image.urlPath || image.pathComponent || '';
    return {
      thumbnailUrl: thumbPath ? `/g2data/thumbnails/${thumbPath}` : '',
      fullImageUrl: fullPath ? `/g2data/albums/${fullPath}` : '',
      // Grid mode (loadFull: false) stops after the thumbnail, like the real hook.
      state: (options.loadFull === false ? 'thumbnail-loaded' : fullPath ? 'full-loaded' : 'thumbnail') as
        | 'full-loaded'
        | 'thumbnail-loaded'
        | 'thumbnail',
      hasError: false,
      error: null,
    };
  }),
}));

// Mock fetch globally – return a 404 response by default so code that
// calls fetch() during tests doesn't crash with "Cannot read properties
// of undefined (reading 'ok')".
global.fetch = vi.fn().mockResolvedValue({
  ok: false,
  status: 404,
  statusText: 'Not Found',
  json: async () => ({}),
  text: async () => '',
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// jsdom has no URL.createObjectURL / URL.revokeObjectURL; stub them so code (and tests that
// vi.spyOn them at module scope) can run. Tests override the return value when they need one.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:mock') as typeof URL.createObjectURL;
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
}
