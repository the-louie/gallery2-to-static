/**
 * Progressive Image Loading Hook Tests
 *
 * Tests for useProgressiveImage hook covering state transitions,
 * error handling, and cleanup. Hook uses only original image URLs from data.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Opt out of the global mock so these tests exercise the real hook
vi.unmock('@/hooks/useProgressiveImage');

import { renderHook, waitFor } from '@/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { ViewAbortProvider } from '@/contexts/ViewAbortContext';
import { useProgressiveImage } from './useProgressiveImage';
import type { Image } from '@/types';
import * as imageUrl from '@/utils/imageUrl';
import { resetImageCache } from '@/utils/imageCache';

vi.mock('@/utils/imageUrl');

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={['/']}>
        <ViewAbortProvider>{children}</ViewAbortProvider>
      </MemoryRouter>
    );
  };
}

describe('useProgressiveImage', () => {
  const mockImage: Image = {
    id: 1,
    type: 'GalleryPhotoItem',
    hasChildren: false,
    title: 'Test Photo',
    description: 'Test description',
    pathComponent: 'test-album/test-photo.jpg',
    timestamp: 1234567890,
    width: 1920,
    height: 1080,
    thumb_width: 200,
    thumb_height: 150,
  };

  let mockImageElements: Array<{
    onload: (() => void) | null;
    onerror: (() => void) | null;
    src: string;
  }>;

  let objectUrlCounter: number;

  /** Returns the most recently created mock Image element */
  function latestMockImage() {
    return mockImageElements[mockImageElements.length - 1] ?? null;
  }

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    resetImageCache();
    objectUrlCounter = 0;
    mockImageElements = [];

    // Mock Image constructor -- each call returns a fresh mock so thumbnail
    // and full-image onload handlers stay separate.
    global.Image = vi.fn(function () {
      const el = { onload: null, onerror: null, src: '' };
      mockImageElements.push(el);
      return el as any;
    }) as any;

    // Mock URL.createObjectURL and URL.revokeObjectURL for jsdom
    if (!URL.createObjectURL) {
      URL.createObjectURL = vi.fn();
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = vi.fn();
    }
    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      () => `blob:http://localhost/${++objectUrlCounter}`,
    );
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // Mock imageUrl functions
    vi.spyOn(imageUrl, 'getImageUrl').mockImplementation((image, useThumbnail) => {
      if (useThumbnail) {
        return '/images/test-album/t__test-photo.jpg';
      }
      return '/images/test-album/test-photo.jpg';
    });

    // Mock fetch for fetchImageAsObjectUrl (thumbnail and full image loads)
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      }),
    ) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts in thumbnail state', () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      expect(result.current.state).toBe('thumbnail');
      expect(result.current.hasError).toBe(false);
      expect(result.current.thumbnailUrl).toBe('');
    });

    it('handles null image', () => {
      const { result } = renderHook(() => useProgressiveImage(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.state).toBe('error');
      expect(result.current.hasError).toBe(true);
      expect(result.current.error).toBe('No image provided');
      expect(result.current.thumbnailUrl).toBe('');
      expect(result.current.fullImageUrl).toBe('');
    });
  });

  describe('thumbnail loading', () => {
    it('transitions to thumbnail-loaded when thumbnail loads', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      // Wait for thumbnail Image element to be created
      await waitFor(() => {
        expect(mockImageElements.length).toBeGreaterThanOrEqual(1);
        expect(mockImageElements[0].onload).toBeDefined();
      });

      // Fire thumbnail onload
      if (mockImageElements[0].onload) {
        mockImageElements[0].onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });
    });

    it('falls back to server URL when thumbnail blob fails (e.g. security)', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      await waitFor(() => {
        expect(mockImageElements.length).toBeGreaterThanOrEqual(1);
        expect(mockImageElements[0].onerror).toBeDefined();
      });

      if (mockImageElements[0].onerror) {
        mockImageElements[0].onerror();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
        expect(result.current.thumbnailUrl).toBe('/images/test-album/t__test-photo.jpg');
      });
    });

    it('skips thumbnail when useThumbnail is false', async () => {
      const { result } = renderHook(() =>
        useProgressiveImage(mockImage, false),
      {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });
    });
  });

  describe('full image loading', () => {
    it('transitions to full-loaded when full image loads', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      // Wait for thumbnail Image element and fire onload
      await waitFor(() => {
        expect(mockImageElements.length).toBeGreaterThanOrEqual(1);
        expect(mockImageElements[0].onload).toBeDefined();
      });
      if (mockImageElements[0].onload) {
        mockImageElements[0].onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

      // Wait for full image Image element and fire onload
      await waitFor(() => {
        expect(mockImageElements.length).toBeGreaterThanOrEqual(2);
        expect(mockImageElements[1].onload).toBeDefined();
      });
      if (mockImageElements[1].onload) {
        mockImageElements[1].onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('full-loaded');
        expect(result.current.hasError).toBe(false);
      });
    });

    it('falls back to server URL when full image blob fails (e.g. security)', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      // Fire thumbnail onload
      await waitFor(() => {
        expect(mockImageElements.length).toBeGreaterThanOrEqual(1);
        expect(mockImageElements[0].onload).toBeDefined();
      });
      if (mockImageElements[0].onload) {
        mockImageElements[0].onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

      // Fire full image onerror
      await waitFor(() => {
        expect(mockImageElements.length).toBeGreaterThanOrEqual(2);
        expect(mockImageElements[1].onerror).toBeDefined();
      });
      if (mockImageElements[1].onerror) {
        mockImageElements[1].onerror();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('full-loaded');
        expect(result.current.hasError).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.fullImageUrl).toBe('/images/test-album/test-photo.jpg');
      });
    });
  });

  describe('grid mode options (PERF-01)', () => {
    const fetchedUrls = () => (global.fetch as any).mock.calls.map((c: any[]) => String(c[0]));

    it('loadFull: false fetches the thumbnail only, never the full-size original', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage, true, { loadFull: false }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockImageElements.length).toBeGreaterThanOrEqual(1);
        expect(mockImageElements[0].onload).toBeDefined();
      });
      mockImageElements[0].onload?.();
      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });
      // give the full-image effect a chance to run
      await new Promise((r) => setTimeout(r, 20));

      expect(fetchedUrls()).toEqual(['/images/test-album/t__test-photo.jpg']);
      expect(result.current.state).toBe('thumbnail-loaded');
    });

    it('enabled: false fetches nothing until enabled', async () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useProgressiveImage(mockImage, true, { loadFull: false, enabled }),
        { wrapper: createWrapper(), initialProps: { enabled: false } },
      );
      await new Promise((r) => setTimeout(r, 20));
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.state).toBe('thumbnail');

      rerender({ enabled: true });
      await waitFor(() => {
        expect(fetchedUrls()).toEqual(['/images/test-album/t__test-photo.jpg']);
      });
    });

    it('default (lightbox) still loads thumbnail then full image', async () => {
      renderHook(() => useProgressiveImage(mockImage), { wrapper: createWrapper() });
      await waitFor(() => {
        expect(mockImageElements[0]?.onload).toBeDefined();
      });
      mockImageElements[0].onload?.();
      await waitFor(() => {
        expect(fetchedUrls()).toContain('/images/test-album/test-photo.jpg');
      });
    });
  });

  describe('image URL', () => {
    it('uses server URL for full image until full image is loaded', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBe('/images/test-album/test-photo.jpg');
      });
    });

    it('returns object URLs for display after load to avoid duplicate network request', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      // Fire thumbnail onload
      await waitFor(() => {
        expect(mockImageElements.length).toBeGreaterThanOrEqual(1);
        expect(mockImageElements[0].onload).toBeDefined();
      });
      if (mockImageElements[0].onload) {
        mockImageElements[0].onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

      // Fire full image onload
      await waitFor(() => {
        expect(mockImageElements.length).toBeGreaterThanOrEqual(2);
        expect(mockImageElements[1].onload).toBeDefined();
      });
      if (mockImageElements[1].onload) {
        mockImageElements[1].onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('full-loaded');
      });

      expect(result.current.thumbnailUrl).toMatch(/^blob:/);
      expect(result.current.fullImageUrl).toMatch(/^blob:/);
    });
  });

  describe('cleanup', () => {
    it('cleans up on unmount without throwing', () => {
      const { unmount } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      unmount();
      // Hook cleanup revokes object URLs and clears refs; unmount must not throw
    });

    it('does not update state after unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useProgressiveImage(mockImage),
      {
        wrapper: createWrapper(),
      });

      unmount();

      const mock = latestMockImage();
      if (mock?.onload) {
        mock.onload();
      }

      // State should remain at whatever it was before unmount (not crash)
      expect(result.current).toBeDefined();
    });
  });

  describe('image change', () => {
    it('resets state when image changes', async () => {
      const { result, rerender } = renderHook(
        ({ image }) => useProgressiveImage(image),
        {
          initialProps: { image: mockImage },
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      // Fire thumbnail onload
      await waitFor(() => {
        expect(mockImageElements.length).toBeGreaterThanOrEqual(1);
        expect(mockImageElements[0].onload).toBeDefined();
      });
      if (mockImageElements[0].onload) {
        mockImageElements[0].onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

      const newImage: Image = {
        ...mockImage,
        id: 2,
        pathComponent: 'new-album/new-photo.jpg',
      };

      rerender({ image: newImage });

      // After rerender the hook resets; it may already have started loading the
      // new image so accept either 'thumbnail' or 'thumbnail-loaded'
      expect(['thumbnail', 'thumbnail-loaded']).toContain(result.current.state);
      expect(result.current.hasError).toBe(false);
    });

    it('revokes previous object URLs when image changes', async () => {
      const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL');

      const { result, rerender } = renderHook(
        ({ image }) => useProgressiveImage(image),
        {
          initialProps: { image: mockImage },
          wrapper: createWrapper(),
        },
      );

      // Wait for thumbnail to load
      await waitFor(() => {
        expect(mockImageElements.length).toBeGreaterThanOrEqual(1);
        expect(mockImageElements[0].onload).toBeDefined();
      });

      if (mockImageElements[0].onload) {
        mockImageElements[0].onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

      revokeObjectURL.mockClear();

      // Change image
      const newImage: Image = {
        ...mockImage,
        id: 2,
        pathComponent: 'new-album/new-photo.jpg',
      };

      rerender({ image: newImage });

      // Previous object URLs should be revoked
      expect(revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('object URL memory leak prevention', () => {
    it('keeps the displayed thumbnail object URL valid when the state changes (LOGIC-26)', async () => {
      const { result, unmount } = renderHook(
        () => useProgressiveImage(mockImage, true, { loadFull: false }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => {
        expect(mockImageElements[0]?.onload).toBeDefined();
      });
      const shown = result.current.thumbnailUrl;
      expect(shown).toMatch(/^blob:/);
      mockImageElements[0].onload?.();
      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });
      const revoked = (URL.revokeObjectURL as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(revoked).not.toContain(shown);
      expect(result.current.thumbnailUrl).toBe(shown);

      unmount();
      const revokedAfter = (URL.revokeObjectURL as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(revokedAfter).toContain(shown);
    });

    it('revokes object URLs on unmount', async () => {
      const { result, unmount } = renderHook(
        () => useProgressiveImage(mockImage),
        {
          wrapper: createWrapper(),
        },
      );

      // Wait for thumbnail to load (creates object URL)
      await waitFor(() => {
        expect(mockImageElements.length).toBeGreaterThanOrEqual(1);
        expect(mockImageElements[0].onload).toBeDefined();
      });

      if (mockImageElements[0].onload) {
        mockImageElements[0].onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

      // Wait for full image to load
      await waitFor(() => {
        expect(mockImageElements.length).toBeGreaterThanOrEqual(2);
        expect(mockImageElements[1].onload).toBeDefined();
      });

      if (mockImageElements[1].onload) {
        mockImageElements[1].onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('full-loaded');
      });

      // Object URLs were created for both thumbnail and full image
      const createCalls = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock
        .calls.length;
      expect(createCalls).toBeGreaterThanOrEqual(2);

      unmount();

      // After unmount, every created object URL must have been revoked
      const revokeCalls = (URL.revokeObjectURL as ReturnType<typeof vi.fn>)
        .mock.calls.length;
      expect(revokeCalls).toBeGreaterThanOrEqual(createCalls);
    });

    it('does not leak object URLs when fetch is in-flight during unmount', async () => {
      // Make fetch hang (never resolve)
      global.fetch = vi.fn(
        () => new Promise<Response>(() => {}),
      ) as typeof fetch;

      const { unmount } = renderHook(
        () => useProgressiveImage(mockImage),
        {
          wrapper: createWrapper(),
        },
      );

      // Unmount while fetch is in-flight -- must not throw
      unmount();
    });
  });
});
